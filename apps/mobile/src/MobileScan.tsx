import { useEffect, useRef, useState } from 'react'
import { Camera, Clipboard, Settings } from 'lucide-react'
import { BoundaryBadge, Button } from '@zk-fighter/ui'
import type { MobileRoute } from './mobile-storage'
import { truncateMiddle } from './mobile-format'

type CameraState = 'idle' | 'requesting' | 'ready' | 'blocked'
type BarcodeDetectorLike = { detect(image: HTMLVideoElement): Promise<readonly { readonly rawValue?: string }[]> }

export function MobileScan({ onRoute, onPay }: { readonly onRoute: (route: MobileRoute) => void; readonly onPay: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const detectorRef = useRef<BarcodeDetectorLike | null>(null)
  const [state, setState] = useState<CameraState>('idle')
  const [code, setCode] = useState('')

  useEffect(() => () => stopCamera(), [])

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('blocked')
      return
    }
    const BarcodeDetector = (window as typeof window & { BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike }).BarcodeDetector
    if (!BarcodeDetector) {
      setState('blocked')
      return
    }
    setState('requesting')
    try {
      detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] })
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setState('ready')
      scanFrame()
    } catch {
      setState('blocked')
    }
  }

  function stopCamera() {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  function scanFrame() {
    const detector = detectorRef.current
    const video = videoRef.current
    if (!detector || !video) return
    frameRef.current = requestAnimationFrame(() => {
      void detector.detect(video).then((codes) => {
        const found = codes.map((item) => item.rawValue ?? '').find((value) => value.startsWith('zkf1'))
        if (found) {
          setCode(found)
          stopCamera()
          setState('idle')
        } else {
          scanFrame()
        }
      }).catch(() => scanFrame())
    })
  }

  return (
    <div className="screen-stack scan-screen">
      <div className="scan-top"><button onClick={() => onRoute('home')}>‹</button><strong>Scan to pay</strong><BoundaryBadge kind={state === 'blocked' ? 'reveals-info' : 'shielded'} label={state === 'blocked' ? 'CAMERA OFF' : 'PRIVATE CODE'} /></div>
      <section className={`scan-stage ${state}`}>
        {state === 'ready' ? <video ref={videoRef} playsInline muted /> : null}
        <div className="scan-reticle"><i /><i /><i /><i /><span /></div>
        <p>{state === 'ready' ? 'Point at a ZK Fighter code.' : state === 'blocked' ? 'Camera scan is unavailable on this device. Paste the code instead, or enable camera in device settings.' : 'Camera stays on-device. Frames are not uploaded.'}</p>
      </section>
      <section className="scan-actions">
        <textarea value={code} placeholder="Paste zkf1... private receive code" onChange={(event) => setCode(event.target.value)} />
        {code.trim() ? <div className="detected-code"><Clipboard size={16} /><span><strong>Code detected</strong><em>{truncateMiddle(code.trim(), 16, 10)}</em></span></div> : null}
        <div className="flow-actions">
          <Button fullWidth variant="secondary" loading={state === 'requesting'} onClick={() => void startCamera()}><Camera size={15} /> {state === 'ready' ? 'Camera ready' : 'Open camera'}</Button>
          <Button fullWidth disabled={!code.trim().startsWith('zkf1')} onClick={() => onPay(code.trim())}>Pay code</Button>
        </div>
        {state === 'blocked' ? <Button fullWidth variant="secondary"><Settings size={15} /> Open settings</Button> : null}
      </section>
    </div>
  )
}
