import { useCallback, useState } from 'react'

export type Theme = 'light' | 'dark'

const KEY = 'accessqr-theme'

function readStored(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(readStored)

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* almacenamiento no disponible: se mantiene solo en memoria */
    }
  }, [])

  return [theme, setTheme]
}
