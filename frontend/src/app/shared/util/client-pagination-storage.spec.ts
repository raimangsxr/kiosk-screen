import {
  CONTENT_LIST_PAGE_SIZE_STORAGE_KEY,
  readContentListPageSize,
  writeContentListPageSize
} from './client-pagination-storage';

describe('client-pagination-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns default when storage is empty', () => {
    expect(readContentListPageSize()).toBe(20);
  });

  it('round-trips valid page sizes', () => {
    writeContentListPageSize(50);
    expect(localStorage.getItem(CONTENT_LIST_PAGE_SIZE_STORAGE_KEY)).toBe('50');
    expect(readContentListPageSize()).toBe(50);

    writeContentListPageSize('all');
    expect(readContentListPageSize()).toBe('all');
  });

  it('falls back to default for invalid stored values', () => {
    localStorage.setItem(CONTENT_LIST_PAGE_SIZE_STORAGE_KEY, '999');
    expect(readContentListPageSize()).toBe(20);
  });
});
