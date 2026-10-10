// Single-owner password login. The session cookie holds an HMAC of a fixed
// message keyed by SESSION_SECRET + APP_PASSWORD, so changing either logs everyone out.

export const SESSION_COOKIE = "momen_session";

async function hmac(key: string, message: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sessionToken() {
  const secret = process.env.SESSION_SECRET ?? "";
  const password = process.env.APP_PASSWORD ?? "";
  return hmac(`${secret}:${password}`, "momen-owner");
}

export async function isValidSession(token: string | undefined) {
  if (!token) return false;
  return token === (await sessionToken());
}
