import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'

interface State<T> {
  data: T | null
  error: string | null
  loading: boolean
}

/** GET con cancelación. Conserva los datos anteriores mientras llegan los nuevos (sin parpadeos al paginar). */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: path !== null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (path === null) {
      setState({ data: null, error: null, loading: false })
      return
    }
    const controller = new AbortController()
    setState((prev) => ({ ...prev, loading: true, error: null }))

    api<T>(path, { signal: controller.signal })
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const message = error instanceof ApiError ? error.message : 'Ocurrió un error inesperado.'
        setState((prev) => ({ data: prev.data, error: message, loading: false }))
      })

    return () => controller.abort()
  }, [path, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}
