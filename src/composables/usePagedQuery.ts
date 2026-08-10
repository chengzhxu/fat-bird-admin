import { ref } from 'vue'
import type { Pagination } from '../types/api'

export function usePagedQuery(defaultPageSize = 20) {
  const page = ref(1)
  const pageSize = ref(defaultPageSize)
  const total = ref(0)

  function applyPagination(meta?: Pagination): void {
    if (!meta) {
      total.value = 0
      return
    }
    page.value = meta.page
    pageSize.value = meta.pageSize
    total.value = meta.total
  }

  function pageParams(extra?: Record<string, string | number | null | undefined>): URLSearchParams {
    const query = new URLSearchParams()
    query.set('page', String(page.value))
    query.set('pageSize', String(pageSize.value))
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        if (value === null || value === undefined || value === '') continue
        query.set(key, String(value))
      }
    }
    return query
  }

  function resetPage(): void {
    page.value = 1
  }

  return { page, pageSize, total, applyPagination, pageParams, resetPage }
}
