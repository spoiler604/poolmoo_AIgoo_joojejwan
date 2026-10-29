(() => {
  'use strict';

  function shapeOf(frame, width, height) {
    let weight = 0, xSum = 0, ySum = 0, xx = 0, yy = 0, xy = 0;
    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x < width; x += 3) {
        const i = (y * width + x) * 4;
        const brightness = Math.max(frame[i], frame[i + 1], frame[i + 2]);
        const w = Math.max(0, brightness - 20) ** 1.5 * frame[i + 3] / 255;
        weight += w; xSum += x * w; ySum += y * w;
        xx += x * x * w; yy += y * y * w; xy += x * y * w;
      }
    }
    if (!weight) return null;
    const x = xSum / weight, y = ySum / weight;
    const a = xx / weight - x * x, b = yy / weight - y * y, c = xy / weight - x * y;
    const spread = Math.hypot(a - b, 2 * c);
    return { x, y, angle: Math.atan2(2 * c, a - b) / 2,
      major: Math.sqrt(Math.max(1, (a + b + spread) / 2)),
      minor: Math.sqrt(Math.max(1, (a + b - spread) / 2)) };
  }

  // Draw decoded video frames directly. The static PNG must never mask the
  // moving arms, and a failed play() must never fade the still image away.
  window.createGalaxyPlayer = ({ root, video, canvas }) => {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const buffer = document.createElement('canvas');
    buffer.width = 800; buffer.height = 450;
    const bufferContext = buffer.getContext('2d', { willReadFrequently: true });
    const still = root.querySelector('.galaxy-art');
    let cancelCurrent = null;
    let alignment = null, feather = null;
    // Match the 600:500 artwork box, so a square PNG and a 16:9 video
    // are measured in the same coordinates before blending.
    canvas.width = 840;
    canvas.height = 700;

    function alignFirstFrame(pixels) {
      const source = shapeOf(pixels, buffer.width, buffer.height);
      if (!source) return;
      let target = null;
      if (still?.complete && still.naturalWidth) {
        const size = canvas.height;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(still, (canvas.width - size) / 2, 0, size, size);
        target = shapeOf(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
      alignment = {
        x: target?.x ?? canvas.width / 2, y: target?.y ?? canvas.height / 2,
        source, angle: target ? target.angle - source.angle : 0,
        scale: target ? Math.max(.65, Math.min(1.6, target.major / source.major)) : 1,
      };
      canvas.dataset.angleCorrection = (alignment.angle * 180 / Math.PI).toFixed(2);
      feather = new Float32Array(buffer.width * buffer.height);
      const cos = Math.cos(source.angle), sin = Math.sin(source.angle);
      const major = source.major * 2.8, minor = source.minor * 2.65;
      for (let y = 0; y < buffer.height; y++) {
        for (let x = 0; x < buffer.width; x++) {
          const dx = x - source.x, dy = y - source.y;
          const radius = Math.hypot((dx * cos + dy * sin) / major, (-dx * sin + dy * cos) / minor);
          const t = Math.max(0, Math.min(1, (1 - radius) / .34));
          feather[y * buffer.width + x] = t * t * (3 - 2 * t);
        }
      }
    }

    return {
      stop() { cancelCurrent?.(false); },
      play(rate = 1, endTime = Infinity) {
        cancelCurrent?.(false);
        if (!context || !bufferContext) return Promise.resolve(false);
        return new Promise((resolve) => {
          let finished = false, callback = 0, guard = 0, frames = 0;
          const useVideoFrames = typeof video.requestVideoFrameCallback === 'function';
          const finish = (success) => {
            if (finished) return;
            finished = true;
            clearTimeout(guard);
            if (useVideoFrames) video.cancelVideoFrameCallback(callback);
            else cancelAnimationFrame(callback);
            video.removeEventListener('ended', ended);
            video.removeEventListener('error', failed);
            video.pause();
            // Keep the last rendered canvas frame during the crossfade.
            root.classList.remove('is-video-playing');
            root.dataset.galaxyPlayback = success ? 'finished' : 'unavailable';
            if (cancelCurrent === finish) cancelCurrent = null;
            resolve(success);
          };
          const ended = () => finish(frames > 0);
          const failed = () => {
            console.warn('Galaxy video could not be displayed:', video.error?.message || 'playback unavailable');
            finish(false);
          };
          const queueFrame = () => {
            callback = useVideoFrames ? video.requestVideoFrameCallback(drawFrame) : requestAnimationFrame(drawFrame);
          };
          const drawFrame = () => {
            if (finished) return;
            if (video.readyState >= 2 && !video.seeking) {
              try {
                bufferContext.drawImage(video, 0, 0, buffer.width, buffer.height);
                const frame = bufferContext.getImageData(0, 0, buffer.width, buffer.height);
                const pixels = frame.data;
                if (!alignment) alignFirstFrame(pixels);
                for (let i = 0; i < pixels.length; i += 4) {
                  const brightness = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
                  const alpha = Math.max(0, Math.min(1, (brightness - 8) / 24));
                  pixels[i + 3] = Math.round(255 * alpha * alpha * (3 - 2 * alpha) * (feather?.[i / 4] ?? 1));
                }
                bufferContext.putImageData(frame, 0, 0);
                context.clearRect(0, 0, canvas.width, canvas.height);
                context.save();
                context.translate(alignment?.x ?? canvas.width / 2, alignment?.y ?? canvas.height / 2);
                context.rotate(alignment?.angle ?? 0);
                context.scale(alignment?.scale ?? 1, alignment?.scale ?? 1);
                context.drawImage(buffer, -(alignment?.source.x ?? buffer.width / 2), -(alignment?.source.y ?? buffer.height / 2));
                context.restore();
                frames++;
                canvas.dataset.frames = String(frames);
                canvas.dataset.mediaTime = video.currentTime.toFixed(3);
                if (frames === 1) {
                  clearTimeout(guard);
                  guard = setTimeout(() => finish(false), (Math.min(Number.isFinite(video.duration) ? video.duration : 8, endTime) / rate + 5) * 1000);
                  root.dataset.galaxyPlayback = 'playing';
                  root.classList.add('is-video-playing');
                }
                if (video.currentTime >= endTime) {
                  finish(true);
                  return;
                }
              } catch (error) {
                console.warn('Galaxy frame could not be drawn:', error.message);
                finish(false);
                return;
              }
            }
            if (!finished) queueFrame();
          };
          cancelCurrent = finish;
          root.dataset.galaxyPlayback = 'loading';
          root.classList.remove('is-video-playing');
          canvas.dataset.frames = '0';
          video.muted = true;
          video.playsInline = true;
          video.playbackRate = rate;
          video.addEventListener('ended', ended);
          video.addEventListener('error', failed);
          guard = setTimeout(failed, 8000);
          try {
            video.currentTime = 0;
            queueFrame();
            Promise.resolve(video.play()).catch(() => { if (!finished) failed(); });
          } catch { failed(); }
        });
      },
    };
  };
})();
