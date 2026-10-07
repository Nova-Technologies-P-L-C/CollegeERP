"use client";

import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import { QrCode, Download, ExternalLink } from "lucide-react";
import { useRef, useCallback, useSyncExternalStore } from "react";

interface ProfileQRCodeProps {
  userId: string;
  userName: string;
}

const emptySubscribe = () => () => {};

export function ProfileQRCode({ userId, userName }: ProfileQRCodeProps) {
  const qrRef = useRef<HTMLDivElement>(null);
  const profileUrl = `/verify/${userId}`;

  const origin = useSyncExternalStore(
    emptySubscribe,
    () => (typeof window !== "undefined" ? window.location.origin : ""),
    () => ""
  );

  const fullUrl = origin ? `${origin}${profileUrl}` : profileUrl;

  const handleDownload = useCallback(() => {
    if (!qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      // 2× resolution for crisp printable QR
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx?.scale(2, 2);
      ctx?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const link = document.createElement("a");
      link.download = `${userName.replace(/\s+/g, "_")}_QR.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    img.src = url;
  }, [userName]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card rounded-xl border border-border p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <QrCode className="w-5 h-5 text-brand-primary" />
        <h3 className="font-semibold text-foreground">My QR Code</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Anyone can scan this code to instantly verify your identity — no login
        needed.
      </p>

      {/* QR Code display */}
      <div
        ref={qrRef}
        className="flex justify-center p-5 bg-white rounded-xl border border-brand-light shadow-inner mb-4"
      >
        <QRCodeSVG
          value={fullUrl}
          size={180}
          bgColor="#FFFFFF"
          fgColor="#131022"
          level="H"
          includeMargin
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          id="qr-download-btn"
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Download className="w-4 h-4" />
          Download PNG
        </button>
        <a
          id="qr-preview-link"
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Preview
        </a>
      </div>
    </motion.div>
  );
}
