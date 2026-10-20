import { useEffect } from 'react'
import type { CardResponse } from '../lib/types'
import { useApi } from './useApi'

/** Carnet del empleado conectado. El QR dura pocos minutos, así que se renueva solo antes de vencer. */
export function useCard() {
  const { data, error, loading, reload } = useApi<CardResponse>('/api/me/card')

  useEffect(() => {
    if (!data?.qr) return
    const id = setTimeout(reload, data.qr.ttlSeconds * 600) // al 60 % de su vigencia
    return () => clearTimeout(id)
  }, [data, reload])

  return { card: data, error, loading, reload }
}
