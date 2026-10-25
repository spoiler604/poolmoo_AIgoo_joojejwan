(function (scope) {
  'use strict';
  function page(value, count, single = false) {
    const n = Math.max(1, Math.min(count, Math.trunc(Number(value) || 1)));
    return single || n === 1 ? n : 2 + Math.floor((n - 2) / 2) * 2;
  }
  function spread(value, count, single = false) {
    const first = page(value, count, single);
    return first === 1 || single ? [first] : [first, first + 1 <= count ? first + 1 : null];
  }
  function next(value, count, single = false) {
    const first = page(value, count, single);
    if (first === 1) return Math.min(2, count);
    return Math.min(first + (single ? 1 : 2), page(count, count, single));
  }
  function previous(value, count, single = false) {
    const first = page(value, count, single);
    return first <= 2 ? 1 : page(first - (single ? 1 : 2), count, single);
  }
  const api = { page, spread, next, previous };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.BookPages = api;
})(typeof window === 'undefined' ? globalThis : window);
