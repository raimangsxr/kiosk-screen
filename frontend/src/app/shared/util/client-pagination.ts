export type ClientPageSize = 10 | 20 | 50 | 100 | 'all';

export const CLIENT_PAGE_SIZE_OPTIONS: readonly ClientPageSize[] = [10, 20, 50, 100, 'all'] as const;

export const DEFAULT_CLIENT_PAGE_SIZE: ClientPageSize = 20;

export function slicePage<T>(items: readonly T[], pageIndex: number, pageSize: ClientPageSize): readonly T[] {
  if (pageSize === 'all' || items.length === 0) {
    return items;
  }
  const start = pageIndex * pageSize;
  return items.slice(start, start + pageSize);
}

export function pageCount(total: number, pageSize: ClientPageSize): number {
  if (total === 0) {
    return 0;
  }
  if (pageSize === 'all') {
    return 1;
  }
  return Math.ceil(total / pageSize);
}

export function clampPageIndex(pageIndex: number, total: number, pageSize: ClientPageSize): number {
  const pages = pageCount(total, pageSize);
  if (pages === 0) {
    return 0;
  }
  return Math.min(Math.max(0, pageIndex), pages - 1);
}

export function formatPaginationRange(
  pageIndex: number,
  pageSize: ClientPageSize,
  total: number
): { start: number; end: number; total: number; label: string } {
  if (total === 0) {
    return { start: 0, end: 0, total: 0, label: '0–0 de 0' };
  }
  if (pageSize === 'all') {
    return { start: 1, end: total, total, label: `1–${total} de ${total}` };
  }
  const start = pageIndex * pageSize + 1;
  const end = Math.min(start + pageSize - 1, total);
  return { start, end, total, label: `${start}–${end} de ${total}` };
}

export function pageSizeLabel(size: ClientPageSize): string {
  return size === 'all' ? 'Todas' : String(size);
}
