(() => {
  'use strict';
  const button = document.querySelector('.sound-toggle');
  if (!button) return;
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  if (!AudioEngine) { button.hidden = true; return; }
  let enabled = true;
  let context, master, effects, ambience, noise, reverb;
  let introAmbience, introLeft = false, introStarted = false;
  const introSources = [];
  let arrived = false, ambientStarted = false, cueCount = 0;
  let musicTimer = 0, nextChordTime = 0, chordIndex = 0;
  const padVoices = [];
  const chords = [
    [130.81, 196, 261.63, 329.63],
    [110, 164.81, 261.63, 329.63],
    [130.81, 174.61, 261.63, 349.23],
    [146.83, 196, 293.66, 392],
  ];
  const voices = new Set();
  const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

  function updateButton() {
    const waiting = enabled && context?.state !== 'running';
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', waiting ? '배경음 시작' : enabled ? '소리 끄기' : '소리 켜기');
    button.title = waiting ? '소리 켜짐 · 눌러서 배경음 시작' : enabled ? '소리 끄기' : '소리 켜기';
    button.dataset.audioState = context?.state || 'waiting';
  }
  function stopEffects() {
    if (!context) return;
    for (const voice of voices) {
      voice.gain.gain.cancelScheduledValues(context.currentTime);
      voice.gain.gain.setTargetAtTime(0, context.currentTime, .025);
      try { voice.source.stop(context.currentTime + .15); } catch {}
    }
  }
  function create() {
    context = new AudioEngine({ latencyHint: 'interactive' });
    master = context.createGain();
    master.gain.value = enabled ? .48 : 0;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -18;
    limiter.ratio.value = 5;
    limiter.attack.value = .008;
    limiter.release.value = .25;
    master.connect(limiter); limiter.connect(context.destination);
    effects = context.createGain(); effects.connect(master);
    ambience = context.createGain(); ambience.gain.value = 0; ambience.connect(master);
    introAmbience = context.createGain(); introAmbience.gain.value = 0; introAmbience.connect(master);
    noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    reverb = context.createConvolver();
    const impulse = context.createBuffer(2, context.sampleRate * 1.8, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 3;
    }
    reverb.buffer = impulse;
    const wet = context.createGain(); wet.gain.value = .13;
    effects.connect(reverb); reverb.connect(wet); wet.connect(master);
    context.onstatechange = updateButton;
  }
  function startIntroAmbient() {
    if (!context || introLeft || introStarted || arrived) return;
    introStarted = true;
    for (const [index, frequency] of [130.81, 196, 293.66].entries()) {
      const oscillator = context.createOscillator(), gain = context.createGain();
      oscillator.type = index === 1 ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index * 3 - 3;
      gain.gain.value = .038;
      oscillator.connect(gain); gain.connect(introAmbience); oscillator.start();
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      introSources.push(oscillator);
    }
    introAmbience.gain.setTargetAtTime(.16, context.currentTime, 1.4);
    button.dataset.introAmbient = 'ready';
  }
  function leaveIntro() {
    if (introLeft) return;
    introLeft = true;
    if (!context || !introStarted) return;
    introAmbience.gain.cancelScheduledValues(context.currentTime);
    introAmbience.gain.setTargetAtTime(0, context.currentTime, .1);
    for (const source of introSources) {
      try { source.stop(context.currentTime + .6); } catch {}
    }
    introSources.length = 0;
    button.dataset.introAmbient = 'faded';
  }
  function startAmbient() {
    if (!context || ambientStarted || !arrived) return;
    ambientStarted = true;
    // Warm, gently detuned pads above a low drone: spacious, not percussive.
    const warmth = context.createBiquadFilter();
    warmth.type = 'lowpass'; warmth.frequency.value = 800; warmth.Q.value = .3;
    warmth.connect(ambience);
    for (let index = 0; index < 4; index++) {
      for (const detune of [-5, 5]) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = detune < 0 ? 'sine' : 'triangle';
        oscillator.frequency.value = chords[0][index];
        oscillator.detune.value = detune;
        gain.gain.value = .028;
        oscillator.connect(gain); gain.connect(warmth); oscillator.start();
        padVoices.push({ oscillator, index });
      }
    }
    const bass = context.createOscillator(), bassGain = context.createGain();
    bass.frequency.value = 65.41; bassGain.gain.value = .055;
    bass.connect(bassGain); bassGain.connect(ambience); bass.start();
    const breath = context.createOscillator(), depth = context.createGain();
    breath.frequency.value = .06; depth.gain.value = .025;
    breath.connect(depth); depth.connect(ambience.gain); breath.start();
    ambience.gain.setTargetAtTime(.15, context.currentTime, 2.5);
    nextChordTime = context.currentTime + 8;
    scheduleHarmony();
    button.dataset.ambient = 'on';
  }
  function scheduleHarmony() {
    clearTimeout(musicTimer);
    if (!context || !ambientStarted || document.hidden) return;
    // Schedule on the audio clock so hiding the tab cannot advance the music.
    while (nextChordTime < context.currentTime + 12) {
      chordIndex = (chordIndex + 1) % chords.length;
      for (const { oscillator, index } of padVoices) {
        oscillator.frequency.setTargetAtTime(chords[chordIndex][index], nextChordTime, 1.8);
      }
      nextChordTime += 8;
    }
    musicTimer = setTimeout(scheduleHarmony, 3000);
  }
  function unlock() {
    try {
      if (!context) create();
      if (context.state === 'suspended' && !document.hidden) context.resume().catch(() => {});
      startIntroAmbient();
      startAmbient();
      if (ambientStarted) scheduleHarmony();
      updateButton();
    } catch { button.hidden = true; }
  }
  function track(source, gain, end, extra = []) {
    const voice = { source, gain };
    voices.add(voice);
    source.onended = () => {
      voices.delete(voice);
      source.disconnect(); gain.disconnect(); extra.forEach(node => node.disconnect());
    };
    source.stop(end);
  }
  function tone(frequency, duration = .7, volume = .07, delay = 0, endFrequency = frequency) {
    const start = context.currentTime + .01 + delay;
    const oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(effects);
    oscillator.start(start);
    track(oscillator, gain, start + duration + .05);
  }
  function air(duration, from, to, volume = .1) {
    const start = context.currentTime + .01;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noise; source.loop = true;
    filter.type = 'bandpass'; filter.Q.value = .65;
    filter.frequency.setValueAtTime(from, start);
    filter.frequency.exponentialRampToValueAtTime(to, start + duration * .75);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + duration * .4);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(effects);
    source.start(start);
    track(source, gain, start + duration + .05, [filter]);
  }
  function cue(name, play) {
    if (!enabled || !context || context.state === 'closed' || document.hidden) return;
    try {
      play();
      button.dataset.lastCue = name;
      button.dataset.cues = String(++cueCount);
    } catch { /* Sound must never interrupt navigation. */ }
  }
  window.ExhibitionSound = {
    unlock,
    leaveIntro,
    intro() { cue('intro', () => { tone(196, 1.3, .11, 0, 261.63); tone(392, 1.1, .055, .15); }); },
    travel() { cue('travel', () => { air(2.8, 140, 1800, .15); tone(65.41, 2.5, .1, 0, 196); }); },
    galaxy(open) {
      unlock();
      cue(open ? 'galaxy-open' : 'galaxy-close', () => {
        air(open ? 2 : 1.2, open ? 200 : 1100, open ? 1300 : 160, .075);
        tone(open ? 196 : 392, 1.1, .075, 0, open ? 392 : 196);
      });
    },
    constellation(index) { cue('constellation', () => tone(scale[index % scale.length], .65, .035)); },
    focus(index) { unlock(); cue('focus', () => { tone(scale[index % scale.length], .7, .065); tone(scale[index % scale.length] * 1.5, .8, .025, .1); }); },
    detail(index) { unlock(); cue('detail', () => { tone(scale[index % 3] * 1.5, .45, .055); tone(scale[index % 3] * 2, .6, .025, .075); }); },
  };
  button.addEventListener('click', () => {
    // If autoplay was blocked, the first speaker click starts sound.
    enabled = enabled && context?.state !== 'running' ? true : !enabled;
    unlock();
    if (context) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(enabled ? .48 : 0, context.currentTime, .04);
      if (!enabled) stopEffects();
    }
    updateButton();
  });
  document.addEventListener('mindmap:reveal', () => {
    leaveIntro();
    arrived = true;
    stopEffects();
    startAmbient();
    cue('arrival', () => { tone(261.63, 1.4, .065); tone(392, 1.5, .04, .08); tone(523.25, 1.6, .025, .16); });
  });
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) { clearTimeout(musicTimer); stopEffects(); context.suspend().catch(() => {}); }
    else if (enabled) { context.resume().catch(() => {}); scheduleHarmony(); }
  });
  // Autoplay is attempted only through normal browser policy. A suspended
  // context stays silent until the visitor uses the speaker or enters the map.
  if (enabled) {
    try { create(); startIntroAmbient(); } catch { button.hidden = true; }
  }
  updateButton();
})();
