import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler } from '../lib/api'
import type { SessionUser } from '../lib/types'

interface AuthValue {
  user: SessionUser | null
  loading: boolean
  login: (email: string, password: string, remember: boolean) => Promise<SessionUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    const controller = new AbortController()

    api<{ user: SessionUser }>('/api/auth/me', { signal: controller.signal })
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
      setUnauthorizedHandler(null)
    }
  }, [])

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const result = await api<{ user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: { email, password, remember },
    })
    setUser(result.user)
    return result.user
  }, [])

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  return value
}
