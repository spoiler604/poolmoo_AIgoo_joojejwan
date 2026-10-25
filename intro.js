(() => {
  'use strict';
  const intro = document.querySelector('#intro');
  const map = document.querySelector('.page-shell');
  if (!intro || !map) return;
  const walking = intro.querySelector('.intro-person-walk');
  const opened = intro.querySelector('.intro-person-open');
  const video = intro.querySelector('.intro-person-video');
  const figure = intro.querySelector('.intro-figure');
  const camera = intro.querySelector('.intro-camera');
  const light = intro.querySelector('.intro-chest-light');
  const invitation = intro.querySelector('.intro-invitation');
  const tunnel = window.createIntroTunnel?.(intro.querySelector('.intro-tunnel'));
  const reduceMotion = () => document.documentElement.dataset.motion === 'reduced';
  const animations = new Set();
  const delays = new Map();
  let entering = false, completed = false, mapRevealed = false;
  let safetyTimer, endVideo;

  // Use the clip's own walking section at idle and continue it on click.
  if (video?.dataset.src) {
    video.preload = 'auto';
    video.muted = true;
    video.addEventListener('loadeddata', () => {
      if (entering || completed) return;
      intro.classList.add('has-video-preview');
      if (!reduceMotion()) video.play().catch(() => {});
    }, { once: true });
    video.addEventListener('timeupdate', () => {
      const idleEnd = Number(video.dataset.idleEnd);
      if (!entering && idleEnd > 0 && video.currentTime >= idleEnd) video.currentTime = 0;
    });
    video.addEventListener('error', () => {
      if (!entering) intro.classList.remove('has-video-preview');
    });
    video.src = video.dataset.src;
  }

  function animate(element, frames, options) {
    if (!element || completed) return Promise.resolve();
    const animation = element.animate(frames, { fill: 'forwards', ...options });
    animations.add(animation);
    return animation.finished.catch(() => {});
  }
  function delay(ms) {
    return new Promise(resolve => {
      const timer = setTimeout(() => { delays.delete(timer); resolve(); }, ms);
      delays.set(timer, resolve);
    });
  }
  function revealMap() {
    document.body.classList.add('intro-revealing');
    if (mapRevealed) return;
    mapRevealed = true;
    document.dispatchEvent(new Event('mindmap:reveal'));
  }
  function finish() {
    if (completed) return;
    completed = true;
    clearTimeout(safetyTimer);
    delays.forEach((resolve, timer) => { clearTimeout(timer); resolve(); });
    delays.clear();
    endVideo?.(false);
    video?.pause();
    tunnel?.stop();
    revealMap();
    intro.hidden = true;
    intro.dataset.stage = 'complete';
    intro.removeAttribute('aria-busy');
    map.inert = false;
    document.body.classList.remove('intro-active', 'intro-revealing');
    animations.forEach(animation => animation.cancel());
    animations.clear();
    document.querySelector('.node-root')?.focus({ preventScroll: true });
  }
  function playOpeningVideo() {
    if (!video?.getAttribute('src')) return Promise.resolve(false);
    return new Promise(resolve => {
      let done = false, shown = false, videoFrame;
      const budget = Math.min(20000, (Number.isFinite(video.duration) ? video.duration * 1000 : 10000) + 5000);
      const timeout = setTimeout(() => settle(false), budget);
      const settle = success => {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        video.removeEventListener('playing', onPlaying);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('error', onError);
        video.removeEventListener('timeupdate', checkEnd);
        if (videoFrame !== undefined) video.cancelVideoFrameCallback?.(videoFrame);
        video.pause();
        endVideo = null;
        resolve(success);
      };
      const onPlaying = () => {
        if (done || shown) return;
        shown = true;
        intro.dataset.openingSource = 'video';
        animate(video, [{ opacity: getComputedStyle(video).opacity }, { opacity: 1 }], { duration: 300 });
        animate(walking, [{ opacity: 1 }, { opacity: 0 }], { duration: 360 });
      };
      const onEnded = () => settle(true);
      const onError = () => settle(false);
      // Stop before the supplied clip cuts back from space to the character.
      const checkEnd = () => {
        const end = Number(video.dataset.end);
        if (end > 0 && video.currentTime >= end) settle(true);
      };
      const watchFrame = () => {
        checkEnd();
        if (!done) videoFrame = video.requestVideoFrameCallback(watchFrame);
      };
      endVideo = settle;
      video.addEventListener('playing', onPlaying, { once: true });
      video.addEventListener('ended', onEnded, { once: true });
      video.addEventListener('error', onError, { once: true });
      video.addEventListener('timeupdate', checkEnd);
      if (video.requestVideoFrameCallback) videoFrame = video.requestVideoFrameCallback(watchFrame);
      // Start directly from the user's click for mobile autoplay compatibility.
      video.play().then(onPlaying).catch(() => settle(false));
    });
  }
  async function showImageOpening() {
    intro.dataset.openingSource = 'image';
    if (!opened.complete) {
      await Promise.race([opened.decode().catch(() => {}), delay(900)]);
    }
    if (completed) return;
    video?.pause();
    intro.classList.remove('has-video-preview');
    animate(video, [{ opacity: getComputedStyle(video).opacity }, { opacity: 0 }], { duration: 250 });
    animate(walking, [
      { opacity: 1, filter: 'blur(0px)' },
      { opacity: .35, filter: 'blur(2px)', offset: .65 },
      { opacity: 0, filter: 'blur(3px)' },
    ], { duration: 1050, easing: 'ease-in-out' });
    await animate(opened, [
      { opacity: 0, filter: 'blur(2px)' },
      { opacity: .65, filter: 'blur(1px)', offset: .55 },
      { opacity: 1, filter: 'blur(0px)' },
    ], { duration: 1350, easing: 'ease-in-out' });
  }
  async function travel() {
    if (completed) return;
    intro.dataset.stage = 'approaching';
    const bounds = figure.getBoundingClientRect();
    const chestX = bounds.left + bounds.width * .52;
    const chestY = bounds.top + bounds.height * .55;
    camera.style.transformOrigin = chestX + 'px ' + chestY + 'px';
    const moveX = innerWidth / 2 - chestX, moveY = innerHeight / 2 - chestY;
    const zoom = Math.max(7, Math.min(11, innerWidth / (bounds.width * .2)));
    const approach = animate(camera, [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: 'translate(' + moveX * .3 + 'px,' + moveY * .3 + 'px) scale(1.6)', opacity: 1, offset: .45 },
      { transform: 'translate(' + moveX + 'px,' + moveY + 'px) scale(' + zoom + ')', opacity: 0 },
    ], { duration: 2050, easing: 'cubic-bezier(.55,.02,.3,1)' });
    animate(light, [{ opacity: .05 }, { opacity: .22 }, { opacity: 0 }], { duration: 1600 });
    animate(intro.querySelector('.intro-stars'), [{ opacity: .5 }, { opacity: 0 }], { duration: 1700 });
    animate(intro.querySelector('.intro-aura'), [{ opacity: .35 }, { opacity: 0 }], { duration: 1700 });
    await delay(620);
    if (completed) return;
    intro.dataset.stage = 'tunnel';
    const journey = tunnel?.start({ x: chestX / innerWidth, y: chestY / innerHeight }) || delay(2300);
    await Promise.all([approach, journey]);
    if (completed) return;
    revealMap();
    intro.dataset.stage = 'arriving';
    await animate(intro, [{ opacity: 1 }, { opacity: 0 }], { duration: 850, easing: 'ease-in-out' });
  }
  async function arriveFromVideo() {
    if (completed) return;
    // The Firefly clip already contains the camera move and space flight.
    // Keep its last space frame, then dissolve directly into our galaxy.
    intro.dataset.stage = 'arriving';
    revealMap();
    await animate(intro, [{ opacity: 1 }, { opacity: 0 }], { duration: 1150, easing: 'ease-in-out' });
  }
  async function enter() {
    if (entering) return;
    entering = true;
    intro.dataset.stage = 'opening';
    intro.classList.add('is-entering');
    intro.setAttribute('aria-label', '별빛을 따라 배움 지도로 들어가는 중');
    intro.setAttribute('aria-busy', 'true');
    safetyTimer = setTimeout(finish, 22000);
    try {
      if (reduceMotion()) {
        revealMap();
        await animate(intro, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
        return;
      }
      animate(invitation, [{ opacity: 1 }, { opacity: 0 }], { duration: 220 });
      const playedVideo = await playOpeningVideo();
      if (completed) return;
      if (playedVideo && video.dataset.travel === 'included') {
        await arriveFromVideo();
      } else {
        if (!playedVideo) await showImageOpening();
        await travel();
      }
    } catch (error) {
      console.warn('Intro fallback:', error);
    } finally {
      finish();
    }
  }
  intro.addEventListener('click', enter);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && entering) finish();
  });
})();
