(() => {
  'use strict';
  const DATA = window.COSMIC_TOPICS;
  const viewport = document.querySelector('.viewport');
  const garden = document.querySelector('.garden');
  const root = document.querySelector('.node-root');
  const galaxyVideo = root.querySelector('.galaxy-video');
  const galaxyPlayer = window.createGalaxyPlayer({ root, video: galaxyVideo, canvas: root.querySelector('.galaxy-motion') });
  const groups = document.querySelector('#main-topics');
  const routes = document.querySelector('.stellar-routes');
  const hint = document.querySelector('#scene-hint');
  const status = document.querySelector('#scene-status');
  const note = document.querySelector('#topic-note');
  const previewLayer = document.querySelector('#topic-previews');
  const previewCards = previewLayer.querySelector('.preview-cards');
  const previewTethers = previewLayer.querySelector('.preview-tethers');
  const reduceMotion = () => document.documentElement.dataset.motion === 'reduced';
  const ROOT = { x: 1200, y: 800 };
  const MAX_ZOOM = 1.2;
  const state = { mode: 'closed', selected: null, view: { ...ROOT, scale: .82 } };
  const views = new Map();
  const appearances = new WeakMap();
  const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
  let flight = 0;
  let flightVersion = 0;
  let drag = null;
  let ignoreClickUntil = 0;
  let noteAnchor = null;
  let noteOffset = { x: 0, y: 0 };
  let noteAnimation = null;
  let pointer = null;
  let proximityFrame = 0;
  let openingVersion = 0;
  let openingResolve = null;
  let galaxySequence = 0;
  const openingTimers = new Set();
  const storyTitle = (star) => star.article?.title || star.presentation?.title || star.book?.title || star.name;

  const mapFitZoom = () => Math.max(.1, Math.min(.64, (viewport.clientWidth - 64) / 2040, (viewport.clientHeight - 115) / 1440));
  const minZoom = () => Math.min(mapFitZoom(), .48, Math.max(.2, (viewport.clientWidth - 40) / 1900)) * 1.1;
  const closedZoom = () => clamp(Math.min(.82, (viewport.clientWidth - 64) / 640), minZoom(), MAX_ZOOM);
  const overviewZoom = () => clamp(mapFitZoom(), minZoom(), MAX_ZOOM);
  const previewMedia = () => views.get(state.selected)?.previews.map(preview => ({ image:preview.image, ratio:preview.ratio })) || [];
  const focusZoom = () => {
    const card = window.PreviewLayout.size(viewport.clientWidth, viewport.clientHeight, previewMedia());
    const width = viewport.clientWidth - (card.compact ? 40 : 2 * card.width + 100);
    const height = viewport.clientHeight - (card.compact ? card.height + 170 : 130);
    return clamp(Math.min(width / 430, height / 440), card.compact ? .5 : .65, MAX_ZOOM);
  };
  const focusOffset = () => {
    const card=window.PreviewLayout.size(viewport.clientWidth,viewport.clientHeight,previewMedia());
    if (!card.compact) return 35;
    const scale=focusZoom();
    const centerY=Math.min(viewport.clientHeight/2-95*scale,viewport.clientHeight-card.height-100-230*scale);
    return (viewport.clientHeight/2-centerY)/scale;
  };

  function chartGeometry(topic, position) {
    // Follow the graph outward from the star closest to the galaxy.
    const entry = topic.points.reduce((best, [x, y], i) => {
      const [bx, by] = topic.points[best];
      return Math.hypot(position.x + x - ROOT.x, position.y + y - ROOT.y) < Math.hypot(position.x + bx - ROOT.x, position.y + by - ROOT.y) ? i : best;
    }, 0);
    const edges = topic.lines.flatMap((line) => line.slice(1).map((to, i) => [line[i], to]));
    const distances = topic.points.map(() => Infinity);
    const visited = new Set();
    distances[entry] = 0;
    while (visited.size < topic.points.length) {
      let current = -1;
      distances.forEach((distance, i) => {
        if (!visited.has(i) && (current < 0 || distance < distances[current])) current = i;
      });
      if (current < 0 || !Number.isFinite(distances[current])) break;
      visited.add(current);
      edges.forEach(([a, b]) => {
        const next = a === current ? b : b === current ? a : -1;
        if (next < 0) return;
        const [x, y] = topic.points[current], [nx, ny] = topic.points[next];
        distances[next] = Math.min(distances[next], distances[current] + Math.hypot(nx - x, ny - y));
      });
    }
    const longest = Math.max(1, ...distances.filter(Number.isFinite));
    return { entry, edges, delays: distances.map((d) => Number.isFinite(d) ? d / longest * .55 : 0) };
  }

  function svgFor(topic, geometry) {
    const lines = geometry.edges.map(([a, b]) => {
      if (geometry.delays[a] > geometry.delays[b]) [a, b] = [b, a];
      const [x, y] = topic.points[a], [nx, ny] = topic.points[b];
      return `<path class="constellation-lines" pathLength="1" style="--draw-delay:${geometry.delays[a]}s" d="M${x} ${y}L${nx} ${ny}"/>`;
    }).join('');
    const important = new Set(topic.stars.map((s) => s.anchor));
    const stars = topic.points.map(([x, y], index) => {
      const major = important.has(index);
      return `<g class="chart-star" style="--draw-delay:${geometry.delays[index]}s;transform-origin:${x}px ${y}px"><circle class="map-star" cx="${x}" cy="${y}" r="${major ? 4.2 : 2.4}"/>${major ? `<path class="map-star-ray" d="M${x-11} ${y}h22M${x} ${y-11}v22"/>` : ''}</g>`;
    }).join('');
    return `<svg class="topic-art" viewBox="-170 -170 340 340" aria-hidden="true" focusable="false">${lines}${stars}</svg>`;
  }

  DATA.forEach((topic, index) => {
    const angle = index / DATA.length * Math.PI * 2;
    const base = { x: ROOT.x + Math.sin(angle) * 790, y: ROOT.y - Math.cos(angle) * 490 };
    const geometry = chartGeometry(topic, base);
    const element = document.createElement('section');
    element.className = `constellation${topic.image ? ' has-illustration' : ''}`;
    element.inert = true;
    element.dataset.topic = topic.id;
    element.style.setProperty('--star-tint', topic.tint);
    element.style.setProperty('--twinkle-delay', `${-index * .67}s`);
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = true;
    button.className = 'topic-hitbox';
    button.setAttribute('aria-label', topic.name);
    button.setAttribute('aria-description', `${index + 1}번, ${topic.kind}. 누르면 확대되어 이야기 미리보기가 나타납니다.`);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', `stars-${topic.id} topic-previews`);
    const illustration = topic.image
      ? `<img class="astronaut-art" src="${topic.image}" alt="" draggable="false" />`
      : '';
    button.innerHTML = `${illustration}${svgFor(topic, geometry)}<span class="topic-name"><strong>${topic.name}</strong></span>`;
    const starGroup = document.createElement('div');
    starGroup.className = 'focus-stars';
    starGroup.id = `stars-${topic.id}`;
    starGroup.inert = true;
    const previews = [];
    const stars = topic.stars.map((star, starIndex) => {
      const [x, y] = star.position || topic.points[star.anchor];
      const node = document.createElement('span');
      node.className = 'star-marker';
      node.dataset.star = String(starIndex + 1);
      node.style.left = `${210 + x}px`;
      node.style.top = `${200 + y}px`;
      node.setAttribute('aria-hidden', 'true');
      node.innerHTML = '<span class="star-core" aria-hidden="true"></span>';
      const preview = makePreview(topic, star, starIndex, node);
      previews.push(preview);
      preview.button.addEventListener('click', () => {
        if (state.selected !== topic.id || starGroup.inert) return;
        window.ExhibitionSound?.detail(starIndex);
        if (star.article) {
          hideNote();
          window.ArticleReader.open(star.article, preview.button, topic.name);
          return;
        }
        if (star.book) {
          hideNote();
          window.BookReader.open(star.book, preview.button);
          return;
        }
        if (noteAnchor?.node === preview.button) hideNote();
        else showNote(topic.id, starIndex, preview.button);
      });
      starGroup.append(node);
      return node;
    });
    element.append(button, starGroup);
    groups.append(element);
    views.set(topic.id, { topic, index, base, geometry, x: base.x, y: base.y, element, button, starGroup, stars, previews, route: null });
    button.addEventListener('click', (event) => {
      // A near-miss beside a star must not zoom the visitor back out.
      if (state.selected !== topic.id) focusTopic(topic.id, event.detail === 0);
    });
  });

  function makePreview(topic, star, index, marker) {
    const element = document.createElement('div');
    element.className = 'preview-card';
    const media = document.createElement('div');
    media.className = 'preview-media';
    media.setAttribute('aria-hidden', 'true');
    let image = star.article?.images?.[0];
    if (star.book) image = `${star.book.basePath}/page-01.jpg`;
    if (star.presentation?.type === 'pdf') image = `${star.presentation.basePath}/page-1.jpg`;
    if (image) {
      const thumbnail = document.createElement('img');
      thumbnail.src = image; thumbnail.alt = ''; thumbnail.draggable = false;
      media.append(thumbnail);
    } else if (star.presentation?.embedUrl) {
      const frame = document.createElement('iframe');
      frame.dataset.src = star.presentation.embedUrl;
      frame.title = `${storyTitle(star)} 미리보기 이미지`;
      frame.tabIndex = -1; frame.inert = true;
      frame.setAttribute('aria-hidden', 'true');
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      media.append(frame);
    } else {
      const paper = document.createElement('div');
      paper.className = star.article ? 'preview-paper' : 'preview-placeholder';
      const title = document.createElement('strong');
      title.textContent = star.article?.title || '새로운 이야기를 기다리는 별';
      const copy = document.createElement('span');
      copy.textContent = star.article ? document.getElementById(star.article.template)?.content.querySelector('.article-intro')?.textContent || '' : '준비 중';
      paper.append(title, copy); media.append(paper);
    }
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'preview-open';
    button.setAttribute('aria-label', `${topic.name} · ${storyTitle(star)} 미리보기`);
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', star.article ? 'article-reader' : star.book ? 'book-reader' : note.id);
    const caption = document.createElement('span'); caption.className = 'preview-caption';
    const title = document.createElement('strong'); title.textContent = storyTitle(star);
    title.title = storyTitle(star);
    const arrow = document.createElement('span'); arrow.className = 'preview-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    caption.append(title, arrow); button.append(caption);
    element.append(media, button);
    button.addEventListener('pointerenter', () => marker.classList.add('is-highlighted'));
    button.addEventListener('pointerleave', () => marker.classList.remove('is-highlighted'));
    button.addEventListener('focus', () => marker.classList.add('is-highlighted'));
    button.addEventListener('blur', () => marker.classList.remove('is-highlighted'));
    const tether = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const ratio=star.article?.imageSize ? star.article.imageSize[0]/star.article.imageSize[1] : 16/9;
    const preview={ element, button, media, tether, image:Boolean(image || star.presentation?.embedUrl), ratio };
    element.classList.toggle('has-preview-image', preview.image);
    const thumbnail=media.querySelector('img');
    if (thumbnail) {
      thumbnail.addEventListener('load', () => {
        preview.ratio=thumbnail.naturalWidth/thumbnail.naturalHeight;
        if (state.selected===topic.id) positionPreviews();
      });
    }
    return preview;
  }

  function positionPreviews() {
    if (previewLayer.hidden || !state.selected) return;
    const view = views.get(state.selected);
    const anchors = view.topic.stars.map((_, index) => starPoint(view.topic.id, index));
    const layout = window.PreviewLayout.arrange({ width: viewport.clientWidth, height: viewport.clientHeight,
      center: screenPoint(view.x, view.y), anchors, scale: state.view.scale, media:previewMedia() });
    previewLayer.classList.toggle('is-compact', layout[0].compact);
    view.previews.forEach((preview, index) => {
      const box = layout[index], point = anchors[index];
      Object.assign(preview.element.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.width}px`, height: `${box.height}px` });
      preview.media.style.setProperty('--thumbnail-scale', String(box.width / 960));
      preview.media.style.height = `${box.mediaHeight}px`;
      let x, y, path;
      if (box.side === 'bottom') {
        x = clamp(point.x, box.x + 18, box.x + box.width - 18); y = box.y;
        path = `M${point.x} ${point.y}Q${point.x} ${y - 24} ${x} ${y}`;
      } else {
        x = box.side === 'left' ? box.x + box.width : box.x;
        y = clamp(point.y, box.y + 20, box.y + box.height - 20);
        path = `M${point.x} ${point.y}L${x} ${y - 9}L${x} ${y + 9}Z`;
      }
      preview.tether.setAttribute('d', path);
    });
  }

  function placeTopics(randomize = false) {
    views.forEach((view) => {
      view.x = view.base.x + (randomize ? (Math.random() * 2 - 1) * 20 : 0);
      view.y = view.base.y + (randomize ? (Math.random() * 2 - 1) * 14 : 0);
      view.element.style.left = `${view.x}px`;
      view.element.style.top = `${view.y}px`;
    });
    drawRoutes();
  }

  function drawRoutes() {
    routes.replaceChildren();
    views.forEach((view) => {
      const [localX, localY] = view.topic.points[view.geometry.entry];
      const end = { x: view.x + localX, y: view.y + localY };
      const dx = end.x - ROOT.x, dy = end.y - ROOT.y;
      const length = Math.hypot(dx, dy);
      const ux = dx / length, uy = dy / length;
      const start = { x: ROOT.x + ux * 185, y: ROOT.y + uy * 185 };
      const bend = (view.index % 2 ? 1 : -1) * 34;
      // Keep the route airy so it guides the eye without competing with the chart.
      const steps = Math.max(4, Math.ceil((length - 185) / 72));
      const points = Array.from({ length: steps + 1 }, (_, i) => {
        const t = i / steps, drift = Math.sin(t * Math.PI) * bend;
        return [start.x + (end.x - start.x) * t - uy * drift, start.y + (end.y - start.y) * t + ux * drift];
      });
      const route = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      route.classList.add('stellar-route');
      route.dataset.route = view.topic.id;
      route.style.color = view.topic.tint;
      const linePoints = [[ROOT.x, ROOT.y], ...points];
      route.innerHTML = `<polyline class="route-thread" pathLength="1" points="${linePoints.map((p) => p.join(',')).join(' ')}"/>${points.map(([x, y], i) => `<g class="route-star" style="--arrival:${i / steps * .4}s;transform-origin:${x}px ${y}px"><circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 3.3 : 2.1}"/>${i % 3 === 0 ? `<path d="M${x-7} ${y}h14M${x} ${y-7}v14"/>` : ''}</g>`).join('')}`;
      routes.append(route);
      view.route = route;
    });
  }

  function cancelOpening(reveal = false) {
    openingVersion++;
    openingTimers.forEach(clearTimeout);
    openingTimers.clear();
    openingResolve?.(false);
    openingResolve = null;
    garden.classList.remove('is-opening');
    groups.setAttribute('aria-busy', 'false');
    views.forEach((view) => {
      view.element.classList.remove('is-unfolding');
      view.element.classList.toggle('is-revealed', reveal);
      view.element.inert = !reveal;
      view.button.disabled = !reveal;
      view.route.classList.remove('is-tracing');
      view.route.classList.toggle('is-connected', reveal);
    });
  }

  function unfoldConstellations() {
    cancelOpening();
    if (reduceMotion()) { cancelOpening(true); return Promise.resolve(true); }
    const version = openingVersion;
    garden.classList.add('is-opening');
    groups.setAttribute('aria-busy', 'true');
    hint.textContent = '은하의 별빛을 따라, 일곱 개의 이야기가 이어집니다';
    return new Promise((resolve) => {
      openingResolve = resolve;
      function later(delay, callback) {
        const timer = setTimeout(() => {
          openingTimers.delete(timer);
          if (version === openingVersion && state.mode !== 'closed') callback();
        }, delay);
        openingTimers.add(timer);
      }
      views.forEach((view) => {
        const departure = 80 + view.index * 140;
        const constellationStart = 650 + view.index * 180;
        later(departure, () => view.route.classList.add('is-tracing'));
        later(departure + 600, () => {
          view.route.classList.replace('is-tracing', 'is-connected');
        });
        later(constellationStart, () => {
          view.element.classList.add('is-unfolding');
          window.ExhibitionSound?.constellation(view.index);
        });
        later(constellationStart + 1050, () => {
          view.element.classList.replace('is-unfolding', 'is-revealed');
          if (view.index === DATA.length - 1) {
            garden.classList.remove('is-opening');
            groups.setAttribute('aria-busy', 'false');
            hint.textContent = '별자리가 모두 나타났습니다 · 은하가 제자리로 돌아옵니다';
            status.textContent = '별빛을 따라 일곱 개의 별자리가 모두 이어졌습니다.';
            openingResolve = null;
            resolve(true);
          }
        });
      });
    });
  }

  function setTopicsInteractive(enabled) {
    views.forEach((view) => {
      view.element.inert = !enabled;
      view.button.disabled = !enabled;
    });
  }

  function playGalaxyVideo(token, playbackRate = 1) {
    if (token !== galaxySequence) return Promise.resolve(false);
    // Use the opening three seconds and crossfade back to the still image.
    return galaxyPlayer.play(playbackRate, 3);
  }

  async function runOpeningSequence() {
    const token = ++galaxySequence;
    galaxyPlayer.stop();
    root.disabled = true;
    setTopicsInteractive(false);
    window.ExhibitionSound?.galaxy(true);
    const unfolded = unfoldConstellations();
    const played = playGalaxyVideo(token, 1.2);
    const [didUnfold, didPlay] = await Promise.all([unfolded, played]);
    if (!didUnfold || token !== galaxySequence || state.mode !== 'overview') return;
    setTopicsInteractive(true);
    root.disabled = false;
    hint.textContent = '별자리를 누르면 가까이, 미리보기 카드를 누르면 이야기';
    status.textContent = didPlay ? '은하 영상이 끝났습니다. 별자리를 선택할 수 있습니다.' : '은하 영상을 재생할 수 없어 정지 이미지로 표시합니다. 별자리를 선택할 수 있습니다.';
  }

  function appear(element, delay = 0) {
    appearances.get(element)?.cancel();
    if (reduceMotion()) return;
    const animation = element.animate([
      { opacity: 0, scale: '.86', translate: '0 12px' },
      { opacity: 1, scale: '1', translate: '0 0' },
    ], { duration: 650, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
    appearances.set(element, animation);
    animation.finished.then(() => appearances.delete(element), () => {});
  }

  function constrain() {
    const s = state.view.scale;
    const xRange = state.mode === 'closed' ? 260 : Math.max(0, (2900 - viewport.clientWidth / s) / 2);
    const yRange = state.mode === 'closed' ? 180 : Math.max(0, (2100 - viewport.clientHeight / s) / 2);
    state.view.x = clamp(state.view.x, ROOT.x - xRange, ROOT.x + xRange);
    state.view.y = clamp(state.view.y, ROOT.y - yRange, ROOT.y + yRange);
  }

  function screenPoint(x, y) {
    return {
      x: viewport.clientWidth / 2 + (x - state.view.x) * state.view.scale,
      y: viewport.clientHeight / 2 + (y - state.view.y) * state.view.scale,
    };
  }

  function render() {
    constrain();
    const { x, y, scale } = state.view;
    garden.style.setProperty('--map-zoom', String(scale));
    garden.style.transform = `translate(${viewport.clientWidth / 2 - x * scale}px, ${viewport.clientHeight / 2 - y * scale}px) scale(${scale})`;
    positionPreviews();
    updateNotePosition();
  }

  function stopFlight() {
    flightVersion++;
    cancelAnimationFrame(flight);
    garden.classList.remove('is-camera-moving');
  }

  function flyTo(target, complete) {
    stopFlight();
    const version = flightVersion;
    if (reduceMotion()) {
      Object.assign(state.view, target);
      render();
      complete?.();
      return;
    }
    const from = { ...state.view };
    const start = performance.now();
    garden.classList.add('is-camera-moving');
    function frame(now) {
      if (version !== flightVersion) return;
      const t = clamp((now - start) / 850, 0, 1);
      const eased = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      for (const key of ['x', 'y', 'scale']) state.view[key] = from[key] + (target[key] - from[key]) * eased;
      render();
      if (t < 1) flight = requestAnimationFrame(frame);
      else { garden.classList.remove('is-camera-moving'); complete?.(); }
    }
    flight = requestAnimationFrame(frame);
  }

  function clearFocus() {
    previewLayer.hidden = true;
    previewLayer.inert = true;
    previewCards.querySelectorAll('iframe').forEach(frame => frame.removeAttribute('src'));
    previewCards.replaceChildren();
    previewTethers.replaceChildren();
    state.selected = null;
    garden.classList.remove('is-focused');
    views.forEach((view) => {
      view.element.classList.remove('is-selected', 'stars-ready');
      view.button.setAttribute('aria-expanded', 'false');
      view.starGroup.inert = true;
      view.stars.forEach((star) => star.style.setProperty('--proximity', '1'));
    });
  }

  function showOverview() {
    const wasClosed = state.mode === 'closed';
    hideNote();
    clearFocus();
    state.mode = 'overview';
    garden.dataset.mode = 'overview';
    garden.classList.add('is-open');
    groups.inert = false;
    root.setAttribute('aria-expanded', 'true');
    hint.textContent = '별자리를 누르면 가까이, 미리보기 카드를 누르면 이야기';
    if (wasClosed) {
      placeTopics(true);
      runOpeningSequence();
    }
    flyTo({ ...ROOT, scale: overviewZoom() });
    status.textContent = garden.classList.contains('is-opening') ? '은하에서 별빛이 이어지며 1번부터 7번까지 별자리를 그리고 있습니다.' : '일곱 개의 별자리가 펼쳐졌습니다.';
  }

  async function closeMap() {
    if (state.mode === 'closing') return;
    const token = ++galaxySequence;
    galaxyPlayer.stop();
    root.disabled = true;
    window.ExhibitionSound?.galaxy(false);
    hideNote();
    clearFocus();
    if (garden.classList.contains('is-opening')) cancelOpening(true);
    state.mode = 'closing';
    garden.dataset.mode = 'closing';
    garden.classList.add('is-closing');
    groups.inert = true;
    hint.textContent = '별자리들이 빛 속으로 사라지고 있습니다';
    status.textContent = '회오리치는 은하와 함께 별자리 지도를 접고 있습니다.';
    await playGalaxyVideo(token, 2);
    if (token !== galaxySequence) return;
    cancelOpening();
    state.mode = 'closed';
    garden.dataset.mode = 'closed';
    garden.classList.remove('is-open', 'is-closing');
    views.forEach((view) => appearances.get(view.element)?.cancel());
    root.setAttribute('aria-expanded', 'false');
    flyTo({ ...ROOT, scale: closedZoom() });
    root.disabled = false;
    hint.textContent = '은하를 눌러 일곱 개의 이야기를 만나보세요';
    status.textContent = '은하가 원래 자리로 돌아오고 별자리 지도를 접었습니다.';
  }

  function enableStars(id, keyboard = false) {
    if (state.selected !== id || state.mode !== 'focus') return;
    const view = views.get(id);
    if (view.element.classList.contains('stars-ready')) return;
    view.starGroup.inert = false;
    view.element.classList.add('stars-ready');
    previewCards.replaceChildren(...view.previews.map(preview => preview.element));
    previewTethers.replaceChildren(...view.previews.map(preview => preview.tether));
    previewLayer.hidden = false;
    previewLayer.inert = false;
    positionPreviews();
    view.previews.forEach((preview, index) => {
      const frame = preview.media.querySelector('iframe');
      if (frame) frame.src = frame.dataset.src;
      appear(preview.element, index * 100);
    });
    view.stars.forEach((star, index) => appear(star, index * 100));
    if (keyboard) view.previews[0].button.focus({ preventScroll: true });
    status.textContent = `${view.topic.name}의 이야기 미리보기 ${view.previews.length}개를 선택할 수 있습니다.`;
  }

  function focusTopic(id, keyboard = false) {
    // Selecting a finished chart may skip the rest of the opening, safely.
    if (garden.classList.contains('is-opening')) cancelOpening(true);
    hideNote();
    clearFocus();
    const view = views.get(id);
    window.ExhibitionSound?.focus(view.index);
    state.mode = 'focus';
    state.selected = id;
    garden.dataset.mode = 'focus';
    garden.classList.add('is-open', 'is-focused');
    groups.inert = false;
    view.element.classList.add('is-selected');
    view.button.setAttribute('aria-expanded', 'true');
    root.setAttribute('aria-expanded', 'true');
    hint.textContent = '미리보기 카드를 눌러 이야기를 열어보세요 · ESC로 멀리 보기';
    flyTo({ x: view.x, y: view.y + focusOffset(), scale: focusZoom() }, () => enableStars(id, keyboard));
  }

  root.addEventListener('click', () => {
    if (root.disabled || state.mode === 'closing') return;
    if (state.mode === 'overview') closeMap();
    else showOverview();
  });
  viewport.addEventListener('dblclick', (event) => {
    if (!event.target.closest('button, .detail') && state.mode === 'focus') showOverview();
  });

  function starPoint(id, starIndex) {
    const view = views.get(id);
    const star = view.topic.stars[starIndex];
    const [dx, dy] = star.position || view.topic.points[star.anchor];
    return screenPoint(view.x + dx, view.y + dy);
  }

  function placeNote(x, y) {
    note.style.left = `${clamp(x, 16, Math.max(16, viewport.clientWidth - note.offsetWidth - 16))}px`;
    note.style.top = `${clamp(y, 16, Math.max(16, viewport.clientHeight - note.offsetHeight - 76))}px`;
  }

  function showNote(id, starIndex, node) {
    hideNote();
    const topic = views.get(id).topic;
    const star = topic.stars[starIndex];
    const presentation = star.presentation;
    const isPdf = presentation?.type === 'pdf';
    const presentationPanel = note.querySelector('.presentation');
    const frame = note.querySelector('.presentation-frame');
    const pages = note.querySelector('.presentation-pages');
    frame.hidden = isPdf;
    pages.hidden = !isPdf;
    pages.replaceChildren();
    note.classList.toggle('has-presentation', Boolean(presentation));
    presentationPanel.hidden = !presentation;
    note.querySelector('.detail-copy').hidden = Boolean(presentation);
    note.querySelector('h2').textContent = storyTitle(star);
    note.querySelector('.note-meta').textContent = `${topic.name} / ${star.name} (${star.latin}) · ${star.bayer}`;
    note.querySelector('.detail-copy').textContent = '이야기를 준비하고 있습니다.';
    note.querySelector('.note-footer').textContent = isPdf ? `아래로 스크롤해 ${presentation.pageCount}쪽의 발표자료를 읽어 보세요` : presentation ? '아래 화살표로 슬라이드를 넘기거나 전체 화면으로 감상하세요' : '아직 쓰이지 않은, 우리만의 이야기';
    if (presentation) {
      frame.title = presentation.title;
      if (isPdf) {
        for (let page = 1; page <= presentation.pageCount; page++) {
          const image = document.createElement('img');
          image.src = `${presentation.basePath}/page-${page}.jpg`;
          image.alt = `${presentation.title} · ${page}쪽`;
          image.loading = page === 1 ? 'eager' : 'lazy';
          image.width = 2200; image.height = 1238;
          pages.append(image);
        }
        pages.scrollTop = 0;
      } else frame.src = presentation.embedUrl;
      note.querySelector('.presentation-link').href = presentation.url;
      note.querySelector('.presentation-link').textContent = isPdf ? 'PDF 새 탭에서 보기 ↗' : '캔바에서 크게 보기 ↗';
    }
    note.hidden = false;
    note.inert = false;
    noteAnchor = { id, starIndex, node };
    node.classList.add('is-active');
    node.setAttribute('aria-expanded', 'true');
    const point = starPoint(id, starIndex);
    const x = point.x + 36 + note.offsetWidth < viewport.clientWidth - 16 ? point.x + 36 : point.x - note.offsetWidth - 36;
    placeNote(x, point.y - note.offsetHeight / 2);
    noteOffset = { x: note.offsetLeft - point.x, y: note.offsetTop - point.y };
    if (!reduceMotion()) noteAnimation = note.animate([
      { opacity: 0, translate: '0 12px', scale: '.96' }, { opacity: 1, translate: '0 0', scale: '1' },
    ], { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)' });
  }

  function hideNote() {
    noteAnimation?.cancel();
    noteAnimation = null;
    if (noteAnchor) {
      noteAnchor.node.classList.remove('is-active');
      noteAnchor.node.setAttribute('aria-expanded', 'false');
    }
    noteAnchor = null;
    note.hidden = true;
    note.inert = true;
    note.querySelector('.presentation-frame').removeAttribute('src');
    note.querySelector('.presentation-pages').replaceChildren();
  }

  function updateNotePosition() {
    if (!noteAnchor) return;
    const point = starPoint(noteAnchor.id, noteAnchor.starIndex);
    placeNote(point.x + noteOffset.x, point.y + noteOffset.y);
  }

  note.querySelector('.detail-close').addEventListener('click', () => {
    const previous = noteAnchor?.node;
    hideNote();
    previous?.focus({ preventScroll: true });
  });

  viewport.addEventListener('wheel', (event) => {
    if (event.target.closest('.detail, .preview-card')) return;
    event.preventDefault();
    stopFlight();
    const { scale } = state.view;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    const next = clamp(scale * Math.exp(-clamp(event.deltaY * unit, -120, 120) * .002), minZoom(), MAX_ZOOM);
    const bounds = viewport.getBoundingClientRect();
    const dx = event.clientX - bounds.left - viewport.clientWidth / 2;
    const dy = event.clientY - bounds.top - viewport.clientHeight / 2;
    state.view.x += dx / scale - dx / next;
    state.view.y += dy / scale - dy / next;
    state.view.scale = next;
    if (state.mode === 'focus') {
      if (next < .7) {
        hideNote(); clearFocus(); state.mode = 'overview'; garden.dataset.mode = 'overview';
        hint.textContent = '별자리를 누르면 가까이, 미리보기 카드를 누르면 이야기';
      } else enableStars(state.selected);
    }
    render();
  }, { passive: false });

  viewport.addEventListener('click', (event) => {
    if (event.detail > 0 && performance.now() < ignoreClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);

  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || drag) return;
    // Suppress only the synthetic click at the end of a drag, not a new press.
    ignoreClickUntil = 0;
    if (event.target.closest('.preview-card, .detail-close')) return;
    const inNote = event.target.closest('.detail');
    if (inNote && !event.target.closest('.note-heading')) return;
    const target = event.target.closest('button') || (inNote ? note : viewport);
    drag = { id: event.pointerId, kind: inNote ? 'note' : 'pan', target, startX: event.clientX, startY: event.clientY,
      x: inNote ? note.offsetLeft : state.view.x, y: inNote ? note.offsetTop : state.view.y, moved: false };
    target.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener('pointermove', (event) => {
    if (drag && event.pointerId === drag.id) {
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      drag.moved = true;
      event.preventDefault();
      if (drag.kind === 'note') {
        noteAnimation?.cancel();
        note.classList.add('is-dragging');
        placeNote(drag.x + dx, drag.y + dy);
        if (noteAnchor) {
          const point = starPoint(noteAnchor.id, noteAnchor.starIndex);
          noteOffset = { x: note.offsetLeft - point.x, y: note.offsetTop - point.y };
        }
      } else {
        stopFlight();
        viewport.classList.add('is-panning');
        state.view.x = drag.x - dx / state.view.scale;
        state.view.y = drag.y - dy / state.view.scale;
        render();
        // Rebase when constrained, making direction changes respond immediately.
        drag.x = state.view.x; drag.y = state.view.y; drag.startX = event.clientX; drag.startY = event.clientY;
      }
      return;
    }
    if (event.pointerType === 'touch') return;
    const rect = viewport.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (!proximityFrame) proximityFrame = requestAnimationFrame(updateProximity);
  });

  function updateProximity() {
    proximityFrame = 0;
    if (!pointer || !state.selected) return;
    const view = views.get(state.selected);
    view.stars.forEach((node, index) => {
      const point = starPoint(state.selected, index);
      const distance = Math.hypot(pointer.x - point.x, pointer.y - point.y);
      const closeness = clamp(1 - distance / 150, 0, 1);
      node.style.setProperty('--proximity', String(1 + Math.pow(closeness, 1.35) * 1.4));
    });
  }

  viewport.addEventListener('pointerleave', () => {
    pointer = null;
    views.forEach((view) => view.stars.forEach((node) => node.style.setProperty('--proximity', '1')));
  });

  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const previous = drag;
    drag = null;
    if (previous.moved) ignoreClickUntil = performance.now() + 250;
    viewport.classList.remove('is-panning'); note.classList.remove('is-dragging');
    if (previous.target.hasPointerCapture(event.pointerId)) previous.target.releasePointerCapture(event.pointerId);
    if (state.mode === 'focus' && state.view.scale >= .7) enableStars(state.selected);
  }
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) viewport.addEventListener(type, endDrag);

  document.addEventListener('keydown', (event) => {
    if (window.BookReader?.isOpen() || window.ArticleReader?.isOpen()) return;
    if (event.key !== 'Escape') return;
    if (noteAnchor) { const node = noteAnchor.node; hideNote(); node.focus({ preventScroll: true }); }
    else if (state.mode === 'focus') showOverview();
    else if (state.mode === 'overview') closeMap();
  });

  window.addEventListener('resize', () => {
    stopFlight();
    if (state.mode === 'closed') Object.assign(state.view, ROOT, { scale: closedZoom() });
    else if (state.mode === 'overview' || state.mode === 'closing') Object.assign(state.view, ROOT, { scale: overviewZoom() });
    else {
      const view = views.get(state.selected);
      Object.assign(state.view, { x: view.x, y: view.y + focusOffset(), scale: focusZoom() });
      enableStars(state.selected);
    }
    render();
  });
  document.addEventListener('mindmap:reveal', () => appear(root));
  placeTopics();
  state.view.scale = closedZoom();
  render();
})();
