(() => {
  'use strict';
  const dialog = document.querySelector('#article-reader');
  if (!dialog) return;
  const scroller = dialog.querySelector('.article-scroll');
  const sheet = dialog.querySelector('.article-sheet');
  const smaller = dialog.querySelector('[data-article-out]');
  const larger = dialog.querySelector('[data-article-in]');
  const output = dialog.querySelector('.article-zoom');
  const close = dialog.querySelector('[data-article-close]');
  let zoom = 1, trigger = null;

  function fit() {
    const image = sheet.classList.contains('is-image') && sheet.querySelector('img');
    // Image windows hug their contents instead of keeping a tall empty page.
    dialog.style.height = '';
    const availableWidth = scroller.clientWidth - (image ? 24 : innerWidth <= 600 ? 16 : 32);
    const ratio = image ? (image.naturalWidth || Number(image.getAttribute('width'))) / (image.naturalHeight || Number(image.getAttribute('height'))) : 1;
    const imageWidth = image ? (scroller.clientHeight - 12) * ratio : Infinity;
    sheet.style.width = `${Math.floor(Math.max(1, Math.min(image ? 1408 : 880, availableWidth, imageWidth)))}px`;
    if (image) {
      const toolbarHeight = dialog.querySelector('.article-toolbar').getBoundingClientRect().height;
      const imageHeight = parseFloat(sheet.style.width) / ratio * zoom;
      const limit = Math.min(900, innerHeight - (innerWidth <= 600 ? 16 : 40));
      dialog.style.height = `${Math.ceil(Math.min(limit, toolbarHeight + imageHeight + 14))}px`;
    }
  }
  function setZoom(value) {
    const next = Math.max(.7, Math.min(2, Math.round(value * 10) / 10));
    const y = scroller.scrollTop / zoom, x = scroller.scrollLeft / zoom;
    zoom = next;
    sheet.style.setProperty('--article-zoom', String(zoom));
    output.value = `${Math.round(zoom * 100)}%`;
    smaller.disabled = zoom <= .7;
    larger.disabled = zoom >= 2;
    scroller.scrollTop = y * zoom;
    scroller.scrollLeft = x * zoom;
    if (sheet.classList.contains('is-image')) fit();
  }
  smaller.addEventListener('click', () => setZoom(zoom - .1));
  larger.addEventListener('click', () => setZoom(zoom + .1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    trigger?.setAttribute('aria-expanded', 'false');
    trigger?.focus({ preventScroll: true });
    trigger = null;
    sheet.replaceChildren();
  });
  // Escape closes this dialog without changing the constellation behind it.
  dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
  window.addEventListener('resize', () => { if (dialog.open) fit(); });
  window.ArticleReader = {
    isOpen: () => dialog.open,
    open(article, source, owner = '') {
      const template = document.getElementById(article.template);
      if (!template?.content) return;
      trigger = source;
      const title = [owner, article.title].filter(Boolean).join(' · ');
      dialog.querySelector('h2').textContent = title;
      scroller.setAttribute('aria-label', title);
      dialog.classList.toggle('is-image', article.layout === 'image');
      sheet.classList.toggle('is-image', article.layout === 'image');
      sheet.replaceChildren(template.content.cloneNode(true));
      sheet.querySelector('img')?.addEventListener('load', () => { if (dialog.open) fit(); }, { once: true });
      dialog.showModal();
      fit();
      setZoom(1);
      scroller.scrollTop = 0;
      scroller.scrollLeft = 0;
      trigger?.setAttribute('aria-expanded', 'true');
      scroller.focus({ preventScroll: true });
    },
  };
})();
