"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { Smartphone, X, Box, Maximize2 } from "lucide-react";

export interface ArAssets {
  /** USDZ em escala reduzida (maquete sobre a mesa). */
  maquete: string;
  /** USDZ em tamanho real (1:1). */
  real: string;
  maqueteScale: string;
  sizeMeters: { x: number; y: number; z: number };
  sizeMb: number;
}

/**
 * "Ver em AR" com o AR Quick Look nativo do iOS (Safari/Chrome no iPhone),
 * sem app. Em outros aparelhos mostra um QR Code para abrir no iPhone.
 */
export function ArButton({ assets }: { assets: ArAssets }) {
  const [open, setOpen] = useState(false);
  const [quickLook, setQuickLook] = useState<boolean | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    const supported = document.createElement("a").relList.supports("ar");
    const params = new URLSearchParams(window.location.search);
    // Detecção do navegador só existe no cliente; abre o painel se veio pelo QR (?ar=1).
    queueMicrotask(() => {
      setQuickLook(supported);
      if (params.get("ar") === "1") setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!open || quickLook !== false) return;
    const url = new URL(window.location.href);
    // Mantém o projeto escolhido (?projeto=...) no link do QR.
    url.searchParams.set("ar", "1");
    void QRCode.toDataURL(url.toString(), { margin: 1, width: 320, color: { dark: "#0b1220", light: "#ffffff" } }).then(setQr);
  }, [open, quickLook]);

  const { x, y, z } = assets.sizeMeters;
  const ratio = Number(assets.maqueteScale.split(":")[1]) || 50;

  return (
    <>
      <button type="button" className="btn-primary h-9 whitespace-nowrap px-3" onClick={() => setOpen(true)} data-testid="ar-button">
        <Smartphone className="size-4" />
        <span>Ver em AR</span>
      </button>

      {open &&
        createPortal(
        <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label="Realidade aumentada">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Fechar" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-2xl border border-line bg-panel p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-3 flex items-center gap-2">
              <Smartphone className="size-5 text-accent" />
              <h2 className="font-semibold">Ver em realidade aumentada</h2>
              <button type="button" onClick={() => setOpen(false)} className="ml-auto grid size-8 place-items-center rounded-md text-muted hover:bg-white/5" aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>

            {quickLook ? (
              <>
                <p className="text-sm text-muted">
                  Aponte o iPhone para o chão ou uma mesa, mova devagar até aparecer o prédio e toque para posicionar. Dá para girar e
                  aproximar com os dedos.
                </p>
                <div className="mt-4 grid gap-3">
                  <a rel="ar" href={`${assets.maquete}#allowsContentScaling=1`} className="card flex items-center gap-3 p-4 hover:border-accent/60">
                    {/* O Quick Look exige uma <img> como primeiro filho do link rel="ar". */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon.svg" alt="" className="size-10" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Box className="size-4 text-accent" /> Maquete na mesa
                      </span>
                      <span className="block text-[12px] text-muted">
                        Escala {assets.maqueteScale} · cerca de {Math.round((x * 100) / ratio)}×{Math.round((z * 100) / ratio)} cm
                      </span>
                    </span>
                  </a>
                  <a rel="ar" href={`${assets.real}#allowsContentScaling=0`} className="card flex items-center gap-3 p-4 hover:border-accent/60">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icon.svg" alt="" className="size-10" />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Maximize2 className="size-4 text-accent" /> Tamanho real (1:1)
                      </span>
                      <span className="block text-[12px] text-muted">
                        {x.toFixed(1)} × {z.toFixed(1)} m · {y.toFixed(1)} m de altura — use em área aberta
                      </span>
                    </span>
                  </a>
                </div>
                <p className="mt-3 text-[12px] text-muted">Download de ~{assets.sizeMb} MB na primeira vez. Use Wi-Fi se possível.</p>
              </>
            ) : quickLook === false ? (
              <>
                <p className="text-sm text-muted">
                  A realidade aumentada abre no <strong className="text-fg">iPhone ou iPad</strong> (Safari). Aponte a câmera do iPhone
                  para o QR Code:
                </p>
                <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
                  {qr ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qr} alt="QR Code para abrir a realidade aumentada no iPhone" className="size-48" />
                  ) : (
                    <div className="size-48 animate-pulse rounded bg-slate-200" />
                  )}
                </div>
                <p className="mt-3 text-[12px] text-muted">
                  Já está no iPhone e caiu aqui? Abra este link no <strong>Safari</strong>.
                </p>
              </>
            ) : null}
          </div>
        </div>,
          // Portal: o header usa backdrop-blur, que prende elementos `fixed` dentro dele.
          document.body,
        )}
    </>
  );
}
