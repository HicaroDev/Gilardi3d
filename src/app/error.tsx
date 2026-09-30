"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-1 text-sm text-muted">Tente novamente. Se persistir, avise o suporte{error.digest ? ` (código ${error.digest})` : ""}.</p>
        <button type="button" onClick={reset} className="btn-primary mt-6">
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
