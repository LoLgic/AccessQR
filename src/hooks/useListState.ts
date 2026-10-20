import { useCallback, useEffect, useState } from 'react'

export type SortDir = 'asc' | 'desc'

export interface SortState<K extends string> {
  key: K
  dir: SortDir
}

/** Orden y página de una tabla paginada en el servidor. Al cambiar los filtros (resetKey) vuelve a la página 1. */
export function useListState<K extends string>(resetKey: string) {
  const [sort, setSort] = useState<SortState<K> | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const toggleSort = useCallback((key: K) => {
    setSort((prev) =>
      prev && prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' },
    )
  }, [])

  return { sort, toggleSort, page, setPage }
}

export function pageInfo(page: number, pageSize: number, total: number) {
  return {
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    from: total === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, total),
  }
}
