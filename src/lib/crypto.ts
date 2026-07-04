import { createCipheriv, createDecipheriv, randomBytes, createHash } from "crypto";
import { env } from "@/lib/env";

function getKey(): Buffer {
  const keyInput = env.tokenEncryptionKey;
  if (!keyInput) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  }
  return createHash("sha256").update(keyInput).digest();
}

export function encryptText(plainText: string): string {
  const iv = randomBytes(12);
  const key = getKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptText(cipherText: string): string {
  const bytes = Buffer.from(cipherText, "base64");
  const iv = bytes.subarray(0, 12);
  const authTag = bytes.subarray(12, 28);
  const encrypted = bytes.subarray(28);
  const key = getKey();
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  const plainText = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plainText.toString("utf8");
}
