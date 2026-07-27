import {
  clampPageIndex,
  formatPaginationRange,
  pageCount,
  slicePage,
  type ClientPageSize
} from './client-pagination';

describe('client-pagination', () => {
  const items = Array.from({ length: 25 }, (_, i) => `item-${i + 1}`);

  it('slicePage returns all items when page size is all', () => {
    expect(slicePage(items, 0, 'all')).toEqual(items);
  });

  it('slicePage returns a page slice', () => {
    expect(slicePage(items, 1, 10)).toEqual(items.slice(10, 20));
  });

  it('clampPageIndex clamps after delete on last page', () => {
    expect(clampPageIndex(2, 21, 10)).toBe(2);
    expect(clampPageIndex(2, 20, 10)).toBe(1);
    expect(clampPageIndex(5, 0, 10)).toBe(0);
  });

  it('formatPaginationRange renders Spanish label', () => {
    expect(formatPaginationRange(1, 10, 87).label).toBe('11–20 de 87');
    expect(formatPaginationRange(0, 'all', 5).label).toBe('1–5 de 5');
    expect(formatPaginationRange(0, 10, 0).label).toBe('0–0 de 0');
  });

  it('pageCount handles empty and all modes', () => {
    expect(pageCount(0, 10)).toBe(0);
    expect(pageCount(25, 10)).toBe(3);
    expect(pageCount(25, 'all')).toBe(1);
  });
});
