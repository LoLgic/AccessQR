import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

export type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'denied' | 'unsupported' | 'error'
export type Facing = 'environment' | 'user'

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }

const SCAN_INTERVAL_MS = 120
const MAX_WIDTH = 640

export function useQrScanner(onDetect: (value: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef(0)
  const onDetectRef = useRef(onDetect)
  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [facing, setFacing] = useState<Facing>('environment')
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  useEffect(() => {
    onDetectRef.current = onDetect
  })

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setTorchSupported(false)
    setTorchOn(false)
  }, [])

  const start = useCallback(
    async (mode: Facing) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported')
        return
      }

      stop()
      setStatus('starting')
      setFacing(mode)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode } },
          audio: false,
        })
        const video = videoRef.current
        if (!video) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        video.srcObject = stream
        await video.play()

        const capabilities = stream.getVideoTracks()[0].getCapabilities?.() as TorchCapabilities | undefined
        setTorchSupported(Boolean(capabilities?.torch))
        setStatus('scanning')

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Canvas no disponible')

        let last = 0
        const loop = (now: number) => {
          frameRef.current = requestAnimationFrame(loop)
          if (now - last < SCAN_INTERVAL_MS || video.readyState < 2 || !video.videoWidth) return
          last = now

          const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
          canvas.width = Math.round(video.videoWidth * scale)
          canvas.height = Math.round(video.videoHeight * scale)
          context.drawImage(video, 0, 0, canvas.width, canvas.height)

          const image = context.getImageData(0, 0, canvas.width, canvas.height)
          const result = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })
          if (result?.data) {
            stop()
            setStatus('idle')
            onDetectRef.current(result.data)
          }
        }
        frameRef.current = requestAnimationFrame(loop)
      } catch (error) {
        stop()
        const name = error instanceof DOMException ? error.name : ''
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error')
      }
    },
    [stop],
  )

  const cancel = useCallback(() => {
    stop()
    setStatus('idle')
  }, [stop])

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
    }
  }, [torchOn])

  const switchCamera = useCallback(() => {
    const next: Facing = facing === 'environment' ? 'user' : 'environment'
    if (status === 'scanning' || status === 'starting') void start(next)
    else setFacing(next)
  }, [facing, status, start])

  // Apaga la cámara al salir de la pantalla.
  useEffect(() => stop, [stop])

  return { videoRef, status, facing, torchSupported, torchOn, start, cancel, toggleTorch, switchCamera }
}
