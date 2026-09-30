import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Token aleatório para links (reset de senha, compartilhamento). */
export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Guardamos apenas o hash de tokens sensíveis no banco. */
export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
