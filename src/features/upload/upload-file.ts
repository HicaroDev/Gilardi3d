"use client";

import { upload } from "@vercel/blob/client";
import { buildStorageKey, MIME_BY_KIND, type FileKindName } from "@/lib/storage-keys";

export type StorageDriver = "blob" | "local";

export interface UploadTarget {
  driver: StorageDriver;
  projectId: string;
  modelId: string;
  versionId: string;
  version: number;
}

/**
 * Envia um arquivo da versão direto para o storage (sem passar pela Function da
 * Vercel) e registra no banco. Retorna o id do File.
 */
export async function uploadVersionFile(
  target: UploadTarget,
  kind: FileKindName,
  name: string,
  body: Blob,
  onProgress?: (percent: number) => void,
): Promise<string> {
  if (target.driver === "local") return uploadLocal(target, kind, name, body, onProgress);

  const pathname = buildStorageKey({ ...target, kind, fileName: name });
  const blob = await upload(pathname, body, {
    access: "private",
    handleUploadUrl: "/api/upload/blob",
    clientPayload: JSON.stringify({ versionId: target.versionId, kind, fileName: name }),
    contentType: MIME_BY_KIND[kind],
    multipart: body.size > 8 * 1024 * 1024,
    onUploadProgress: (e) => onProgress?.(Math.round(e.percentage)),
  });
  const res = await fetch(`/api/versions/${target.versionId}/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, name, pathname: blob.pathname }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? "Falha ao registrar o arquivo");
  return json.fileId as string;
}

function uploadLocal(
  target: UploadTarget,
  kind: FileKindName,
  name: string,
  body: Blob,
  onProgress?: (percent: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    const qs = new URLSearchParams({ versionId: target.versionId, kind, name });
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/api/upload/local?${qs}`);
    xhr.setRequestHeader("Content-Type", MIME_BY_KIND[kind]);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let json: { fileId?: string; error?: string } = {};
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        /* resposta vazia */
      }
      if (xhr.status >= 200 && xhr.status < 300 && json.fileId) resolve(json.fileId);
      else reject(new Error(json.error ?? `Falha no upload (HTTP ${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Falha de rede no upload"));
    xhr.send(body);
  });
}

export async function setVersionStatus(
  versionId: string,
  body:
    | { status: "PROCESSING" }
    | { status: "READY"; stats: { elements: number; categories: number; storeys: number; schema: string | null } }
    | { status: "FAILED"; error: string },
) {
  const res = await fetch(`/api/versions/${versionId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Falha ao atualizar status");
  }
}

/** Lê o começo do arquivo para validar o cabeçalho IFC antes do upload. */
export async function readHeader(file: Blob, bytes = 4096) {
  return new TextDecoder("latin1").decode(await file.slice(0, bytes).arrayBuffer());
}
