import QrCodeSvg from '../QrCodeSvg'
import type { CardResponse } from '../../lib/types'

/** El QR vigente del carnet, o un aviso si la credencial no se puede usar. */
export default function CardQr({ card, className }: { card: CardResponse; className: string }) {
  if (card.qr) {
    return <QrCodeSvg value={card.qr.token} label={`Código QR de ${card.employee.fullName}`} className={className} />
  }

  const message =
    card.employee.status === 'inactivo'
      ? 'Tu carnet está inactivo. Contacta al administrador.'
      : card.employee.credentialStatus === 'por_revisar'
        ? 'Tu credencial está en revisión. Contacta al administrador.'
        : 'Tu credencial no está disponible. Contacta al administrador.'

  return (
    <div
      role="status"
      className={`flex items-center justify-center rounded-2xl bg-slate-100 p-6 text-center text-sm text-slate-600 ${className}`}
    >
      {message}
    </div>
  )
}
