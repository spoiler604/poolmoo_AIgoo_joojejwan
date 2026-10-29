(() => {
  'use strict';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function metrics(width, height, media = [], count = media.length || 3) {
    const compact = width < 720 || height < 520;
    return Array.from({length:count}, (_, index) => {
      const image = Boolean(media[index]?.image);
      const ratio = clamp(Number(media[index]?.ratio) || 16 / 9, .3, 4);
      const cardWidth = compact ? Math.min(count === 1 ? 340 : 170, Math.floor((width - 24 - 12 * (count - 1)) / count)) : clamp(Math.floor((width - 420) / 2), 170, image ? 340 : 250);
      const mediaHeight = image ? Math.round(Math.min(cardWidth / ratio, compact ? Math.min(220, height * .25) : Math.min(340, (height - 100) * .5))) : Math.round(cardWidth * 9 / 16);
      const captionHeight = compact ? 64 : 82;
      return { compact, image, width:cardWidth, height:mediaHeight+captionHeight, mediaHeight, captionHeight };
    });
  }
  function size(width, height, media = []) {
    const cards=metrics(width,height,media);
    return { compact:cards[0].compact, width:Math.max(...cards.map(card=>card.width)), height:Math.max(...cards.map(card=>card.height)) };
  }
  function arrange({ width, height, center, anchors, scale, media = [] }) {
    const cards = metrics(width, height, media, anchors.length);
    const gap = 12, margin = 16;
    if (cards[0].compact) {
      const start = (width - cards.reduce((sum, card) => sum + card.width, 0) - gap * (cards.length - 1)) / 2;
      return anchors.map((_, index) => ({ ...cards[index], x: start + index * (cards[index].width + gap), y: height - cards[index].height - 76, side: 'bottom' }));
    }
    const order = anchors.map((point, index) => ({ ...point, index })).sort((a, b) => a.x - b.x);
    const left = new Set([order[0].index]);
    if (order[1] && order[1].x < center.x - 15) left.add(order[1].index);
    const exclusion = 190 * scale + 20;
    const results = anchors.map((point, index) => ({ ...cards[index], side:left.has(index)?'left':'right', anchorY:point.y }));
    const available = height - 100;
    const columnSize = items => items.reduce((sum, item) => sum + item.height, 0) + Math.max(0,items.length-1)*gap;
    // Put tall portrait covers in opposite columns before reducing their size.
    for (const side of ['left','right']) {
      const column=results.filter(item=>item.side===side), other=results.filter(item=>item.side!==side);
      if (column.length>1 && columnSize(column)>available) {
        const move=column.slice().sort((a,b)=>b.height-a.height).find(item=>columnSize([...other,item])<=available);
        if (move) move.side=side==='left'?'right':'left';
      }
    }
    for (const side of ['left','right']) {
      const column=results.filter(item=>item.side===side);
      if (columnSize(column)>available) {
        const room=available-column.reduce((sum,item)=>sum+item.captionHeight,0)-Math.max(0,column.length-1)*gap;
        const factor=room/column.reduce((sum,item)=>sum+item.mediaHeight,0);
        for (const item of column) {
          item.mediaHeight=Math.floor(item.mediaHeight*factor);
          item.height=item.mediaHeight+item.captionHeight;
        }
      }
    }
    results.forEach(card => {
      const {side}=card;
      const x = side === 'left' ? center.x - exclusion - card.width - 24 : center.x + exclusion + 24;
      const minX = side === 'left' ? margin : width / 2 + gap / 2;
      const maxX = side === 'left' ? width / 2 - card.width - gap / 2 : width - card.width - margin;
      card.x=clamp(x,minX,maxX); card.y=card.anchorY-card.height/2;
    });
    for (const side of ['left', 'right']) {
      const column = results.filter(item => item.side === side).sort((a, b) => a.y - b.y);
      let end = 24 - gap;
      for (const item of column) { item.y = Math.max(24, item.y, end + gap); end = item.y + item.height; }
      let start = height - 76 + gap;
      for (const item of column.reverse()) { item.y = Math.min(item.y, start - gap - item.height); start = item.y; }
    }
    return results;
  }
  window.PreviewLayout = { size, arrange };
})();
