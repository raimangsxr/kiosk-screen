import { DEFAULT_CLIENT_PAGE_SIZE, type ClientPageSize } from './client-pagination';

export const CONTENT_LIST_PAGE_SIZE_STORAGE_KEY = 'kiosk_admin_content_list_page_size';

const VALID_PAGE_SIZES = new Set<ClientPageSize>([10, 20, 50, 100, 'all']);

export function readContentListPageSize(): ClientPageSize {
  if (typeof globalThis.localStorage === 'undefined') {
    return DEFAULT_CLIENT_PAGE_SIZE;
  }
  const raw = globalThis.localStorage.getItem(CONTENT_LIST_PAGE_SIZE_STORAGE_KEY);
  if (raw === 'all') {
    return 'all';
  }
  const numeric = Number(raw);
  if (numeric === 10 || numeric === 20 || numeric === 50 || numeric === 100) {
    return numeric;
  }
  return DEFAULT_CLIENT_PAGE_SIZE;
}

export function writeContentListPageSize(pageSize: ClientPageSize): void {
  if (!VALID_PAGE_SIZES.has(pageSize)) {
    return;
  }
  if (typeof globalThis.localStorage === 'undefined') {
    return;
  }
  globalThis.localStorage.setItem(
    CONTENT_LIST_PAGE_SIZE_STORAGE_KEY,
    pageSize === 'all' ? 'all' : String(pageSize)
  );
}
