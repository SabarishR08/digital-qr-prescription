"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

type QrScannerProps = {
  onResult: (text: string) => void;
};

export default function QrScanner({ onResult }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !videoRef.current) {
      return;
    }

    const codeReader = new BrowserQRCodeReader();
    let cancelled = false;

    codeReader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (cancelled) {
          return;
        }
        if (result) {
          onResult(result.getText());
        }
        if (err && err.name !== "NotFoundException") {
          setError("Camera error. Please try again.");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Unable to access camera.");
        }
      });

    return () => {
      cancelled = true;
      codeReader.reset();
    };
  }, [active, onResult]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm"
          type="button"
          onClick={() => {
            setError(null);
            setActive((prev) => !prev);
          }}
        >
          {active ? "Stop camera" : "Start camera"}
        </button>
        <p className="text-xs text-slate-500">
          Allow camera access to scan QR codes.
        </p>
      </div>
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-900/5">
        <video ref={videoRef} className="h-52 w-full object-cover" muted />
      </div>
    </div>
  );
}
