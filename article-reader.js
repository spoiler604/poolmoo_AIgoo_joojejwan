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

  function decorateCodeDocument() {
    let line = 0;
    sheet.querySelectorAll('h1,h2,h3,h4,p,blockquote,figure,pre,summary,.article-kicker,.article-section-label').forEach(element => {
      let target = element;
      if (element.tagName === 'PRE') {
        target = document.createElement('div');
        target.className = 'editor-diagram-line';
        element.before(target);
        target.append(element);
      }
      target.classList.add('editor-line');
      const number = document.createElement('span');
      number.className = 'editor-line-number';
      number.textContent = String(++line);
      number.setAttribute('aria-hidden', 'true');
      target.prepend(number);
    });
    // Color terms without interpreting any document content as HTML or code.
    const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.parentElement.closest('a,pre,.editor-line-number') && /\b(?:AI|AGI|LLM|CPU|GPU|ChatGPT|Claude|Gemini|MoMA)\b/.test(node.textContent)) nodes.push(node);
    }
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\b(?:AI|AGI|LLM|CPU|GPU|ChatGPT|Claude|Gemini|MoMA)\b)/g).forEach((text, index) => {
        if (index % 2) {
          const token = document.createElement('span');
          token.className = 'editor-token'; token.textContent = text;
          fragment.append(token);
        } else fragment.append(document.createTextNode(text));
      });
      node.replaceWith(fragment);
    });
  }

  function fit() {
    const image = sheet.classList.contains('is-image') && sheet.querySelector('img');
    // Image windows hug their contents instead of keeping a tall empty page.
    dialog.style.height = '';
    const availableWidth = scroller.clientWidth - (image ? 24 : innerWidth <= 600 ? 16 : 32);
    const ratio = image ? (image.naturalWidth || Number(image.getAttribute('width'))) / (image.naturalHeight || Number(image.getAttribute('height'))) : 1;
    const imageWidth = image ? (scroller.clientHeight - 12) * ratio : Infinity;
    sheet.style.width = `${Math.floor(Math.max(1, Math.min(image ? 1408 : dialog.classList.contains('is-code') ? 1040 : 880, availableWidth, imageWidth)))}px`;
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
      dialog.classList.toggle('is-code', article.layout !== 'image');
      sheet.classList.toggle('is-image', article.layout === 'image');
      sheet.replaceChildren(template.content.cloneNode(true));
      if (article.layout !== 'image') decorateCodeDocument();
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
