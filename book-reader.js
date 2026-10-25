(() => {
  'use strict';
  const dialog = document.querySelector('#book-reader');
  if (!dialog) return;
  const main = dialog.querySelector('.reader-main'), stage = dialog.querySelector('.reader-stage');
  const pages = dialog.querySelector('.reader-pages'), counter = dialog.querySelector('.reader-counter');
  const tip = dialog.querySelector('.reader-tip'), progress = dialog.querySelector('.reader-progress');
  const previous = dialog.querySelector('[data-book-prev]'), next = dialog.querySelector('[data-book-next]');
  const zoom = dialog.querySelector('[data-book-zoom]');
  const narrow = matchMedia('(max-width: 800px)');
  const model = window.BookPages;
  let book = null, current = 1, zoomed = false, trigger = null, busy = false, version = 0, pointer = null;
  let ignoreClickUntil = 0;
  const animations = new Set();
  const single = () => narrow.matches || zoomed;
  const reduced = () => document.documentElement.dataset.motion === 'reduced';
  const sourceFor = page => `${book.basePath}/page-${String(page).padStart(2, '0')}.jpg`;

  function fit() {
    if (!book || !dialog.open) return;
    const ratio = current === 1 || single() ? 16 / 9 : 32 / 9;
    const maxWidth = current === 1 && !zoomed ? 740 : Infinity;
    const width = zoomed && narrow.matches ? Math.max(760, main.clientWidth * 2) : Math.max(1, Math.min(main.clientWidth - 44, (main.clientHeight - 42) * ratio, maxWidth));
    stage.style.width = `${width}px`;
    stage.style.height = `${width / ratio}px`;
  }
  function paper(page, side) {
    const node = document.createElement(page ? 'button' : 'div');
    node.className = `reader-paper ${side ? `is-${side}` : ''}${page ? '' : ' is-blank'}`;
    if (!page) { node.textContent = '끝'; return node; }
    node.type = 'button';
    node.setAttribute('aria-label', current === 1 && !zoomed ? '책 펼치기' : `${page}쪽 ${zoomed ? '펼침으로 돌아가기' : '확대 보기'}`);
    const image = document.createElement('img');
    image.src = sourceFor(page); image.alt = `${book.title} · ${page}쪽`; image.draggable = false;
    node.append(image);
    node.addEventListener('click', () => {
      if (busy || performance.now() < ignoreClickUntil) return;
      if (current === 1 && !zoomed) go(2);
      else { current = page; toggleZoom(); }
    });
    return node;
  }
  function render() {
    if (!book) return;
    current = model.page(current, book.pageCount, single());
    stage.classList.toggle('is-cover', current === 1 && !zoomed);
    stage.classList.toggle('is-single', current === 1 || single());
    dialog.classList.toggle('is-zoomed', zoomed);
    const spread = model.spread(current, book.pageCount, single());
    pages.replaceChildren(...spread.map((page, index) => paper(page, spread.length > 1 ? index ? 'right' : 'left' : '')));
    const canNext = model.next(current, book.pageCount, single()) !== current;
    const canPrevious = current > 1;
    previous.disabled = busy || !canPrevious; next.disabled = busy || !canNext;
    next.textContent = current === 1 ? '책 펼치기 →' : '다음 →';
    dialog.querySelector('.reader-corner.is-prev').disabled = busy || !canPrevious;
    dialog.querySelector('.reader-corner.is-next').disabled = busy || !canNext;
    zoom.disabled = busy;
    zoom.textContent = zoomed ? '펼침으로 돌아가기' : '한 쪽 크게 보기';
    zoom.setAttribute('aria-pressed', String(zoomed));
    counter.textContent = `${spread.filter(Boolean).join('–')} / ${book.pageCount}`;
    progress.max = String(book.pageCount); progress.value = String(current); progress.disabled = busy;
    tip.textContent = zoomed ? narrow.matches ? '좌우로 움직여 자세히 읽어보세요 · 버튼으로 페이지 넘기기' : '좌우 화살표로 넘기기 · ESC로 펼침 보기' : current === 1 ? '표지를 눌러 펼쳐보세요' : '모서리를 누르거나 좌우로 드래그해 넘기세요 · 페이지를 누르면 확대';
    fit();
    // Preload only the adjacent spread rather than all 28 high-resolution images.
    for (const p of [current - 1, current + 1, current + 2, current + 3]) {
      if (p >= 1 && p <= book.pageCount) { const image = new Image(); image.src = sourceFor(p); }
    }
  }
  async function animate(element, frames, duration = 620) {
    if (reduced()) return;
    const animation = element.animate(frames, { duration, easing: 'cubic-bezier(.3,.05,.25,1)', fill: 'both' });
    animations.add(animation);
    await animation.finished.catch(() => {});
    animations.delete(animation); animation.cancel();
  }
  function cancelTurn() {
    version++; animations.forEach(a => a.cancel()); animations.clear();
    stage.querySelectorAll('.reader-sheet').forEach(node => node.remove());
    busy = false; dialog.removeAttribute('aria-busy');
  }
  function face(page, back = false) {
    const node = document.createElement('div'); node.className = `reader-face${back ? ' is-back' : ''}`;
    if (page) { const image = new Image(); image.src = sourceFor(page); image.alt = ''; node.append(image); }
    return node;
  }
  async function go(value) {
    if (!book || busy) return;
    const target = model.page(value, book.pageCount, single());
    if (target === current) return;
    const token = ++version, forward = target > current, pageHadFocus = pages.contains(document.activeElement);
    busy = true; dialog.setAttribute('aria-busy', 'true');
    const oldSpread = model.spread(current, book.pageCount, single());
    const newSpread = model.spread(target, book.pageCount, single());
    previous.disabled = next.disabled = zoom.disabled = progress.disabled = true;
    if (current !== 1 && target !== 1 && !single() && !reduced()) {
      const sheet = document.createElement('div'); sheet.className = `reader-sheet ${forward ? 'is-forward' : 'is-backward'}`;
      sheet.setAttribute('aria-hidden', 'true');
      const front = forward ? oldSpread[1] : oldSpread[0], back = forward ? newSpread[0] : newSpread[1];
      sheet.append(face(front), face(back, true));
      if (forward) pages.replaceChildren(paper(oldSpread[0], 'left'), paper(newSpread[1], 'right'));
      else pages.replaceChildren(paper(newSpread[0], 'left'), paper(oldSpread[1], 'right'));
      stage.append(sheet);
      await animate(sheet, [{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${forward ? -180 : 180}deg)` }]);
      sheet.remove();
    } else {
      await animate(pages, [{ opacity: 1, transform: 'rotateY(0deg)' }, { opacity: .15, transform: `rotateY(${forward ? -34 : 34}deg)` }], 250);
    }
    if (token !== version || !dialog.open) return;
    current = target; render();
    if (oldSpread.length === 1 || newSpread.length === 1) {
      await animate(pages, [{ opacity: .25, transform: `rotateY(${forward ? 18 : -18}deg)` }, { opacity: 1, transform: 'rotateY(0deg)' }], 280);
    }
    if (token !== version || !dialog.open) return;
    busy = false; dialog.removeAttribute('aria-busy'); render();
    if (pageHadFocus) (next.disabled ? previous : next).focus({ preventScroll: true });
  }
  function toggleZoom() {
    if (!book || busy) return;
    zoomed = !zoomed; render();
    zoom.focus({ preventScroll: true });
  }
  function close() {
    if (!dialog.open) return;
    cancelTurn(); dialog.close();
  }
  dialog.addEventListener('close', () => {
    cancelTurn();
    trigger?.classList.remove('is-active'); trigger?.setAttribute('aria-expanded', 'false');
    trigger?.focus({ preventScroll: true }); trigger = null; book = null;
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (zoomed) toggleZoom(); else close(); });
  dialog.querySelector('[data-book-close]').addEventListener('click', close);
  previous.addEventListener('click', () => go(model.previous(current, book.pageCount, single())));
  next.addEventListener('click', () => go(model.next(current, book.pageCount, single())));
  dialog.querySelector('.reader-corner.is-prev').addEventListener('click', () => go(model.previous(current, book.pageCount, single())));
  dialog.querySelector('.reader-corner.is-next').addEventListener('click', () => go(model.next(current, book.pageCount, single())));
  zoom.addEventListener('click', toggleZoom);
  progress.addEventListener('change', () => go(Number(progress.value)));
  dialog.addEventListener('keydown', event => {
    event.stopPropagation();
    if (event.key === 'Escape') { event.preventDefault(); if (zoomed) toggleZoom(); else close(); return; }
    if (event.target.matches('input') || busy) return;
    const target = event.key === 'ArrowRight' ? model.next(current, book.pageCount, single()) : event.key === 'ArrowLeft' ? model.previous(current, book.pageCount, single()) : event.key === 'Home' ? 1 : event.key === 'End' ? book.pageCount : null;
    if (target !== null) { event.preventDefault(); go(target); }
  });
  stage.addEventListener('pointerdown', event => {
    if (event.button !== 0 || busy || zoomed || event.target.closest('.reader-corner')) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointermove', event => {
    if (pointer?.id === event.pointerId && Math.abs(event.clientX - pointer.x) > 10) stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointerup', event => {
    if (pointer?.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; pointer = null;
    if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      ignoreClickUntil = performance.now() + 350;
      go(dx < 0 ? model.next(current, book.pageCount, single()) : model.previous(current, book.pageCount, single()));
    }
  });
  stage.addEventListener('pointercancel', () => { pointer = null; });
  narrow.addEventListener('change', () => { if (dialog.open) { cancelTurn(); render(); } });
  new ResizeObserver(fit).observe(main);
  window.BookReader = {
    isOpen: () => dialog.open,
    open(value, source) {
      if (dialog.open) close();
      book = value; trigger = source; current = 1; zoomed = false; busy = false;
      dialog.querySelector('h2').textContent = value.title;
      dialog.querySelector('.reader-eyebrow').textContent = value.subtitle;
      dialog.querySelector('.reader-original').href = value.pdfUrl;
      source?.classList.add('is-active'); source?.setAttribute('aria-expanded', 'true');
      dialog.showModal(); render();
    },
    close,
  };
})();
