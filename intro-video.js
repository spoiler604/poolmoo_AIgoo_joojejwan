(() => {
  'use strict';
  window.createIntroVideo = ({ intro, video }) => {
    if (!video) return null;
    // The generated walk settles naturally here. The hands start rising
    // toward the chest immediately after this point.
    const loopStart = .08, stopTime = 2.02;
    let disposed = false, entering = false, decoded = false;
    let callback = 0, stopTimer = 0, finishTimer = 0, resolveFinish = null;
    const videoFrames = typeof video.requestVideoFrameCallback === 'function';
    const settle = success => {
      clearTimeout(finishTimer);
      if (!resolveFinish) return;
      const resolve = resolveFinish;
      resolveFinish = null;
      resolve(success);
    };
    const failed = () => {
      intro.dataset.videoState = 'unavailable';
      intro.classList.remove('has-video');
      if (entering) settle(false);
    };
    function queueFrame() {
      callback = videoFrames ? video.requestVideoFrameCallback(drawFrame) : requestAnimationFrame(drawFrame);
    }
    function holdAtRest() {
      if (disposed) return;
      clearTimeout(stopTimer);
      video.pause();
      video.currentTime = stopTime;
      intro.dataset.videoTime = stopTime.toFixed(3);
      if (entering) {
        intro.dataset.videoState = 'stopped';
        settle(decoded);
      } else {
        intro.dataset.videoState = 'looping';
        stopTimer = setTimeout(restartWalk, 140);
      }
    }
    function restartWalk() {
      if (disposed || entering) return;
      clearTimeout(stopTimer);
      video.currentTime = loopStart;
      intro.dataset.videoState = 'walking';
      if (videoFrames) video.cancelVideoFrameCallback(callback);
      else cancelAnimationFrame(callback);
      queueFrame();
      playToRest();
    }
    function playToRest() {
      if (disposed) return;
      try {
        Promise.resolve(video.play()).then(() => {
          if (disposed) return;
          clearTimeout(stopTimer);
          const remaining = Math.max(0, stopTime - video.currentTime);
          stopTimer = setTimeout(holdAtRest, remaining / video.playbackRate * 1000 + 40);
        }).catch(failed);
      } catch { failed(); }
    }
    function drawFrame() {
      if (disposed) return;
      if (video.readyState >= 2 && !video.seeking) {
        decoded = true;
        intro.classList.add('has-video');
        intro.dataset.videoTime = video.currentTime.toFixed(3);
        if (video.currentTime >= stopTime) {
          holdAtRest();
          return;
        }
      }
      if (!disposed) queueFrame();
    }
    const ended = () => {
      if (decoded) holdAtRest();
      else intro.dataset.videoState = 'unavailable';
    };
    const visibility = () => {
      if (disposed) return;
      if (document.hidden) {
        clearTimeout(stopTimer);
        video.pause();
      } else if (!entering && video.currentTime >= stopTime - .03) restartWalk();
      else playToRest();
    };
    video.muted = true;
    video.playsInline = true;
    video.playbackRate = .82;
    video.addEventListener('ended', ended);
    video.addEventListener('error', failed);
    document.addEventListener('visibilitychange', visibility);
    queueFrame();
    playToRest();
    return {
      finishWalk() {
        if (disposed || video.error) return Promise.resolve(false);
        entering = true;
        clearTimeout(stopTimer);
        intro.dataset.videoState = 'finishing';
        return new Promise(resolve => {
          resolveFinish = resolve;
          finishTimer = setTimeout(() => settle(false), 5000);
          if (video.currentTime >= stopTime - .03) holdAtRest();
          else playToRest();
        });
      },
      stop() {
        if (disposed) return;
        disposed = true;
        clearTimeout(stopTimer);
        settle(false);
        clearTimeout(finishTimer);
        if (videoFrames) video.cancelVideoFrameCallback(callback);
        else cancelAnimationFrame(callback);
        video.pause();
        video.removeEventListener('ended', ended);
        video.removeEventListener('error', failed);
        document.removeEventListener('visibilitychange', visibility);
        if (decoded) intro.classList.add('video-handoff');
        intro.classList.remove('has-video');
        intro.dataset.videoState = decoded ? 'handoff' : 'unavailable';
      },
    };
  };
})();
