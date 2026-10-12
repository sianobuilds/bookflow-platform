import "server-only";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const industries = [
  "accommodation",
  "restaurant",
  "hair",
  "beauty"
] as const;

export type Industry = (typeof industries)[number];

export type Account = {
  id: string;
  email: string;
  passwordHash: string;
  businessName: string;
  industry: Industry;
  createdAt: string;
};

const directory = path.join(process.cwd(), ".bookflow-data");
const accountFile = path.join(directory, "accounts.json");
const secretFile = path.join(directory, "auth-secret");

export function readAccounts(): Account[] {
  if (!fs.existsSync(accountFile)) return [];
  return JSON.parse(fs.readFileSync(accountFile, "utf8"));
}

export function writeAccounts(accounts: Account[]) {
  fs.mkdirSync(directory, { recursive: true });
  const temp = accountFile + "." + crypto.randomUUID() + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(accounts, null, 2), {
    mode: 0o600
  });
  fs.renameSync(temp, accountFile);
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return salt + ":" + hash;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;

  const actual = crypto.scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");

  return actual.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actual, expectedBuffer);
}

function getSecret() {
  return fs.readFileSync(secretFile, "utf8").trim();
}

export function createSession(accountId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      id: accountId,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");

  return payload + "." + signature;
}

export function sessionAccount(token?: string) {
  if (!token) return null;

  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expected = crypto
      .createHmac("sha256", getSecret())
      .update(payload)
      .digest();

    const supplied = Buffer.from(signature, "base64url");

    if (
      expected.length !== supplied.length ||
      !crypto.timingSafeEqual(expected, supplied)
    ) return null;

    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      typeof data.id !== "string" ||
      typeof data.exp !== "number" ||
      data.exp < Date.now()
    ) return null;

    return readAccounts().find(a => a.id === data.id) ?? null;
  } catch {
    return null;
  }
}

export function publicAccount(account: Account) {
  return {
    id: account.id,
    email: account.email,
    businessName: account.businessName,
    industry: account.industry
  };
}
