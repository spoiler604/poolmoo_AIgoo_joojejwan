(() => {
  'use strict';
  const clamp = (v, min = 0, max = 1) => Math.max(min, Math.min(max, v));
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };

  // No rendering at idle; the particle scene starts on the visitor's click.
  window.createIntroTunnel = canvas => {
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!ctx) return null;
    let width = 0, height = 0, frame = 0, stopped = false, started = false;
    let resolveFinished, lastTime = 0, distance = 0;
    const finished = new Promise(resolve => { resolveFinished = resolve; });
    const stars = Array.from({ length: innerWidth < 600 ? 220 : 280 }, () => ({
      angle: Math.random() * Math.PI * 2, radius: .09 + Math.random() * .9,
      depth: .1 + Math.random() * 3.9, size: .6 + Math.random() * 1.1, warmth: Math.random(),
    }));
    const resize = () => {
      width = innerWidth; height = innerHeight;
      // A 4K display should not require painting millions of extra pixels.
      const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1600000 / (width * height)));
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const stop = () => {
      if (stopped) return;
      stopped = true; cancelAnimationFrame(frame);
      removeEventListener('resize', resize); resolveFinished();
    };
    const start = origin => {
      if (started || stopped) return finished;
      started = true; resize(); addEventListener('resize', resize);
      const began = performance.now();
      lastTime = began;
      canvas.dataset.state = 'running'; canvas.style.opacity = '1';
      const draw = now => {
        if (stopped) return;
        const elapsed = now - began, progress = clamp(elapsed / 3100);
        const dt = Math.min(40, now - lastTime) / 1000;
        lastTime = now;
        const entrance = smooth(elapsed / 1150), settle = smooth((progress - .72) / .28);
        const speed = (.2 + 3 * Math.sin(progress * Math.PI) ** 2) * (1 - settle * .94);
        const travel = dt * speed;
        distance += travel;
        const cx = width * (origin.x + (.5 - origin.x) * entrance);
        const cy = height * (origin.y + (.5 - origin.y) * entrance);
        const radius = Math.hypot(width, height) * (.035 + 1.15 * entrance);
        const focal = Math.max(width, height) * .58, spin = distance * .095;
        ctx.clearRect(0, 0, width, height); ctx.save();
        // Follow the diamond-shaped chest opening, without a circular portal rim.
        ctx.beginPath(); ctx.moveTo(cx, cy - radius * 1.2);
        ctx.lineTo(cx + radius * .82, cy); ctx.lineTo(cx, cy + radius * 1.2);
        ctx.lineTo(cx - radius * .82, cy); ctx.closePath(); ctx.clip();
        const backdrop = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height));
        backdrop.addColorStop(0, `rgba(${Math.round(24 - settle * 18)},9,${Math.round(46 - settle * 28)},${smooth(elapsed / 550)})`);
        backdrop.addColorStop(.4, `rgba(9,7,24,${smooth(elapsed / 550)})`);
        backdrop.addColorStop(1, `rgba(3,7,18,${smooth(elapsed / 550)})`);
        ctx.fillStyle = backdrop; ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'screen';
        for (let i = 0; i < 3; i++) {
          const a = spin + i * Math.PI * 2 / 3, spread = Math.min(width, height) * (.32 + i * .09);
          const x = cx + Math.cos(a) * spread, y = cy + Math.sin(a) * spread * .65;
          const mist = ctx.createRadialGradient(x, y, 0, x, y, spread * 1.5);
          mist.addColorStop(0, i % 2 ? '#4163a51a' : '#9d46bf1c'); mist.addColorStop(1, '#00000000');
          ctx.fillStyle = mist; ctx.fillRect(0, 0, width, height);
        }
        for (const star of stars) {
          star.depth -= travel;
          if (star.depth < .13) star.depth += 3.85;
          const a = star.angle + spin;
          const x = cx + Math.cos(a) * star.radius * focal / star.depth;
          const y = cy + Math.sin(a) * star.radius * focal / star.depth;
          if (x < -100 || x > width + 100 || y < -100 || y > height + 100) continue;
          const tail = .015 + speed * .085 * (1 - settle), previousDepth = star.depth + tail;
          const px = cx + Math.cos(a - .008 * speed) * star.radius * focal / previousDepth;
          const py = cy + Math.sin(a - .008 * speed) * star.radius * focal / previousDepth;
          const alpha = clamp((4 - star.depth) / 2.8, .08, .9) * smooth(elapsed / 600);
          const hue = star.warmth > .78 ? 280 - settle * 55 : 225;
          const streak = ctx.createLinearGradient(px, py, x, y);
          streak.addColorStop(0, `hsla(${hue},70%,72%,0)`);
          streak.addColorStop(1, `hsla(${hue},65%,91%,${alpha})`);
          ctx.strokeStyle = streak; ctx.lineWidth = clamp(star.size / star.depth, .5, 2.6); ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
          ctx.fillStyle = `rgba(237,233,255,${alpha})`;
          ctx.beginPath(); ctx.arc(x, y, clamp(star.size / star.depth * .6, .45, 2), 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        if (progress >= 1) {
          canvas.dataset.state = 'settled'; removeEventListener('resize', resize); resolveFinished();
        } else frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
      return finished;
    };
    return { start, stop, finished };
  };
})();
