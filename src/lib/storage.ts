import "server-only";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { del, head, issueSignedToken, presignUrl } from "@vercel/blob";
import { storageDriver } from "./env";

/**
 * Armazenamento de arquivos BIM.
 * - Produção: Vercel Blob **privado**. Upload direto do navegador (client upload)
 *   e download por URL pré-assinada de curta duração — o arquivo nunca passa
 *   pela Function (limite de 4,5 MB) e nunca fica público.
 * - Desenvolvimento sem token: disco local em `.storage/`.
 */

export { EXT_BY_KIND, MIME_BY_KIND, buildStorageKey, safeName } from "./storage-keys";

// ------------------------------------------------------------------ local

const LOCAL_ROOT = join(process.cwd(), ".storage");

function localPath(key: string) {
  const full = normalize(join(LOCAL_ROOT, key));
  if (!full.startsWith(LOCAL_ROOT)) throw new Error("Caminho de arquivo inválido");
  return full;
}

export async function writeLocal(key: string, body: ReadableStream<Uint8Array>, maxBytes: number) {
  const path = localPath(key);
  await mkdir(dirname(path), { recursive: true });
  let size = 0;
  const limiter = async function* (source: AsyncIterable<Uint8Array>) {
    for await (const chunk of source) {
      size += chunk.length;
      if (size > maxBytes) throw new Error("Arquivo maior que o limite permitido");
      yield chunk;
    }
  };
  try {
    await pipeline(Readable.fromWeb(body as unknown as WebReadableStream<Uint8Array>), limiter, createWriteStream(path));
  } catch (e) {
    await rm(path, { force: true });
    throw e;
  }
  return size;
}

export async function readLocal(key: string) {
  const path = localPath(key);
  const info = await stat(path);
  const stream = Readable.toWeb(createReadStream(path)) as unknown as ReadableStream<Uint8Array>;
  return { stream, size: info.size };
}

// ------------------------------------------------------------------ blob

export async function blobInfo(pathname: string) {
  const info = await head(pathname);
  return { size: info.size, contentType: info.contentType, url: info.url };
}

async function presignedGet(pathname: string, ttlMs: number) {
  const validUntil = Date.now() + ttlMs;
  const signed = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(signed, { operation: "get", pathname, access: "private", validUntil });
  return presignedUrl;
}

// ------------------------------------------------------------------ API comum

export interface StoredFileRef {
  id: string;
  storageKey: string;
  provider: "BLOB" | "LOCAL";
}

/** URL para o navegador baixar o arquivo (pré-assinada no Blob; rota protegida no local). */
export async function downloadUrl(file: StoredFileRef, opts: { shareToken?: string; ttlMs?: number } = {}) {
  if (file.provider === "BLOB") return presignedGet(file.storageKey, opts.ttlMs ?? 60 * 60 * 1000);
  const qs = opts.shareToken ? `?share=${encodeURIComponent(opts.shareToken)}` : "";
  return `/api/files/${file.id}${qs}`;
}

export async function deleteStored(files: StoredFileRef[]) {
  const blobKeys = files.filter((f) => f.provider === "BLOB").map((f) => f.storageKey);
  if (blobKeys.length) {
    try {
      await del(blobKeys);
    } catch (e) {
      console.error("[storage] falha ao apagar blobs", e);
    }
  }
  for (const f of files.filter((f) => f.provider === "LOCAL")) {
    await rm(localPath(f.storageKey), { force: true }).catch(() => undefined);
  }
}

export const currentProvider = () => (storageDriver() === "blob" ? "BLOB" : "LOCAL") as "BLOB" | "LOCAL";
