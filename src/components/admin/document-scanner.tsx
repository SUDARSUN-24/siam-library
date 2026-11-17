"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, RotateCcw, ScanLine, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Dict } from "@/lib/dict";
import { cornersMoved, detectDocument, documentGuide, DOCUMENT_GUIDE, drawCameraFrame, rectifyDocument, type DocumentQuad } from "@/lib/document-scanner";

type Props = { t: Dict; onClose: () => void; onSave: (file: File) => void; onNativeCamera: () => void };
type Phase = "starting" | "searching" | "steady" | "processing" | "error";
type Preview = { file: File; url: string; ratio: number };

export function DocumentScanner({ t, onClose, onSave, onNativeCamera }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureRef = useRef<(() => void) | null>(null);
  const saveRef = useRef(onSave);
  const [phase, setPhase] = useState<Phase>("starting");
  const [quad, setQuad] = useState<DocumentQuad | null>(null);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { saveRef.current = onSave; }, [onSave]);

  useEffect(() => {
    if (preview) return;
    const videoElement = videoRef.current;
    let cancelled = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let capturing = false;
    let latest: DocumentQuad | null = null;
    let anchor: DocumentQuad | null = null;
    let stableSince = 0;
    let lastPixels: Uint8ClampedArray | null = null;
    const analysis = document.createElement("canvas");
    const stop = () => {
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      captureRef.current = null;
    };

    async function capture(corners: DocumentQuad, automatic = false) {
      const video = videoRef.current;
      if (cancelled || capturing || !video || video.readyState < 2) return;
      capturing = true;
      setPhase("processing");
      try {
        const source = document.createElement("canvas");
        const sourceHeight = Math.min(video.videoHeight, video.videoWidth / 0.75);
        drawCameraFrame(video, source, Math.min(2000, Math.round(sourceHeight)));
        stop();
        const result = rectifyDocument(source, corners);
        const blob = await new Promise<Blob | null>((resolve) => result.toBlob(resolve, "image/jpeg", 0.92));
        if (cancelled) return;
        if (!blob) throw new Error("Cannot encode scan");
        const file = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
        if (automatic) saveRef.current(file);
        else setPreview({ file, url: URL.createObjectURL(file), ratio: result.width / result.height });
      } catch {
        stop();
        if (!cancelled) setPhase("error");
      }
    }

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera unavailable");
        const acquired = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 2560 } },
        });
        if (cancelled) {
          acquired.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = acquired;
        const video = videoRef.current;
        if (!video) { stop(); return; }
        video.srcObject = acquired;
        await video.play();
        if (cancelled) return;
        setPhase("searching");
        captureRef.current = () => { void capture(latest ?? DOCUMENT_GUIDE); };
        timer = setInterval(() => {
          if (capturing || video.readyState < 2 || document.hidden) {
            anchor = null;
            lastPixels = null;
            return;
          }
          try {
            const ctx = drawCameraFrame(video, analysis, 320);
            const frame = ctx.getImageData(0, 0, analysis.width, analysis.height);
            latest = detectDocument(frame);
            setQuad(latest);
            let motion = 0;
            if (lastPixels) {
              for (let i = 0; i < frame.data.length; i += 64) motion += Math.abs(frame.data[i] - lastPixels[i]);
              motion /= Math.ceil(frame.data.length / 64);
            }
            lastPixels = frame.data;
            if (!latest) {
              anchor = null;
              setProgress(0);
              setPhase("searching");
              return;
            }
            const now = performance.now();
            if (!anchor || cornersMoved(anchor, latest) || motion > 8) {
              anchor = latest;
              stableSince = now;
            }
            const held = Math.min(1, (now - stableSince) / 900);
            setProgress(held);
            setPhase("steady");
            if (held === 1) void capture(latest, true);
          } catch {
            stop();
            setPhase("error");
          }
        }, 220);
      } catch {
        stop();
        if (!cancelled) setPhase("error");
      }
    }
    void start();
    return () => {
      cancelled = true;
      stop();
      if (videoElement && videoElement.srcObject === stream) videoElement.srcObject = null;
    };
  }, [preview, attempt]);

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview.url); };
  }, [preview]);

  function retry() {
    setQuad(null);
    setProgress(0);
    setPhase("starting");
    setPreview(null);
    setAttempt((n) => n + 1);
  }

  const status = preview ? t.scanReview : {
    starting: t.scanStarting, searching: t.scanAlign, steady: t.scanHoldStill,
    processing: t.scanProcessing, error: t.scanCameraError,
  }[phase];
  const guide = documentGuide(quad);
  const guidePath = guide.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");
  const ratio = preview?.ratio ?? 0.75;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-h-[100dvh] max-w-full gap-3 overflow-y-auto rounded-none sm:max-w-lg sm:rounded-xl" data-testid="document-scanner">
        <div className="flex items-center justify-between gap-3">
          <DialogTitle>{t.scanTitle}</DialogTitle>
          <Button type="button" variant="ghost" size="icon" aria-label={t.adminCancel} onClick={onClose}><X /></Button>
        </div>
        <DialogDescription>{t.scanHint}</DialogDescription>
        {!preview && phase !== "error" && <p className="flex items-center justify-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400"><ScanLine className="size-4" aria-hidden="true" />{t.scanAutomatic}</p>}
        <div className="relative mx-auto overflow-hidden rounded-lg bg-paper" style={{ width: `min(100%, calc((100dvh - 20rem) * ${ratio}))`, aspectRatio: ratio, minWidth: "150px" }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- local camera blob, revoked on close/retake
            <img src={preview.url} alt={t.scanPreviewAlt} className="absolute inset-0 h-full w-full object-contain" data-testid="scan-preview" />
          ) : (
            <>
              <video ref={videoRef} autoPlay muted playsInline aria-label={t.scanTitle} className="absolute inset-0 h-full w-full object-cover" />
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
                <path d={`M0 0H100V100H0Z M${guide[0].x * 100} ${guide[0].y * 100} L${guide.slice(1).map((p) => `${p.x * 100} ${p.y * 100}`).join(" L")} Z`} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
                <polygon points={guidePath} fill="none" stroke={quad ? "#34d399" : "white"} strokeWidth="0.6" strokeDasharray={quad ? undefined : "3 2"} />
                {quad && <polygon points={quad.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")} fill="rgba(52,211,153,0.12)" stroke="#34d399" strokeWidth="0.8" />}
              </svg>
              {phase === "steady" && <div className="absolute right-3 bottom-3 left-3 rounded-lg bg-black/65 px-3 py-2 text-center text-sm font-medium text-white" aria-hidden="true">{t.scanHoldStill}</div>}
              {(phase === "starting" || phase === "processing") && <div className="absolute inset-0 grid place-items-center bg-black/50"><Loader2 className="size-9 animate-spin text-white" aria-hidden="true" /></div>}
            </>
          )}
        </div>
        <p className="min-h-10 text-center text-sm" role="status">{status}</p>
        {!preview && <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full bg-emerald-500 transition-[width] duration-200" style={{ width: `${progress * 100}%` }} /></div>}
        <div className="flex flex-wrap justify-center gap-2">
          {preview ? (
            <>
              <Button type="button" size="lg" variant="outline" onClick={retry}><RotateCcw />{t.scanRetake}</Button>
              <Button type="button" size="lg" onClick={() => onSave(preview.file)}><Check />{t.scanUsePhoto}</Button>
            </>
          ) : phase === "error" ? (
            <>
              <Button type="button" size="lg" variant="outline" onClick={retry}><RotateCcw />{t.scanRetry}</Button>
              <Button type="button" size="lg" onClick={onNativeCamera}><Camera />{t.scanNativeCamera}</Button>
            </>
          ) : (
            <Button type="button" size="lg" variant="outline" disabled={phase === "starting" || phase === "processing"} onClick={() => captureRef.current?.()}><Camera />{t.scanCapture}</Button>
          )}
        </div>
        {!preview && phase !== "error" && <p className="text-center text-xs text-muted-foreground">{t.scanManualHint}</p>}
      </DialogContent>
    </Dialog>
  );
}
