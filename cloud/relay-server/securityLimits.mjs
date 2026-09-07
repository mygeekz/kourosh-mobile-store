import crypto from "node:crypto";
import net from "node:net";

export const normalizeIp = (value) => String(value || "").trim().replace(/^::ffff:/, "").replace(/^\[|\]$/g, "");
export const isLoopbackIp = (value) => {
  const ip = normalizeIp(value);
  return ip === "::1" || ip === "localhost" || ip.startsWith("127.");
};
export const validIp = (value) => {
  const ip = normalizeIp(value);
  return net.isIP(ip) ? ip : null;
};

export const resolveCloudRelayClientIp = (req, config = {}) => {
  const socketIp = validIp(req?.socket?.remoteAddress) || "unknown";
  const mode = String(config.mode || "direct").trim().toLowerCase();
  if (mode === "trusted_loopback_edge" && isLoopbackIp(socketIp)) {
    const expectedSecret = String(config.trustedLoopbackEdgeSecret || "");
    const suppliedSecret = String(req.headers?.["x-kourosh-edge-auth"] || "");
    if (expectedSecret && suppliedSecret && expectedSecret.length === suppliedSecret.length) {
      let equal = false;
      try { equal = crypto.timingSafeEqual(Buffer.from(expectedSecret), Buffer.from(suppliedSecret)); } catch {}
      if (equal) return validIp(req.headers?.["x-kourosh-edge-client-ip"]) || socketIp;
    }
  }
  if (mode === "cloudflare") {
    const trusted = new Set((config.cloudflareTrustedProxyIps || []).map(normalizeIp).filter(Boolean));
    if (trusted.has(socketIp)) return validIp(req.headers?.["cf-connecting-ip"]) || socketIp;
  }
  return socketIp;
};

export class BoundedWindowRateLimiter {
  constructor({ windowMs, maxAttempts, maxEntries = 4096 }) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
    this.maxEntries = maxEntries;
    this.buckets = new Map();
  }
  check(key, now = Date.now()) {
    this.cleanup(now);
    const normalized = String(key || "unknown").slice(0, 128);
    let bucket = this.buckets.get(normalized);
    if (!bucket || bucket.resetAt <= now) bucket = { attempts: 0, resetAt: now + this.windowMs, lastSeen: now };
    bucket.attempts += 1; bucket.lastSeen = now;
    this.buckets.set(normalized, bucket);
    if (this.buckets.size > this.maxEntries) {
      const oldest = [...this.buckets.entries()].sort((a,b) => a[1].lastSeen - b[1].lastSeen).slice(0, this.buckets.size - this.maxEntries);
      for (const [oldKey] of oldest) this.buckets.delete(oldKey);
    }
    return { allowed: bucket.attempts <= this.maxAttempts, retryAfterMs: Math.max(1, bucket.resetAt - now), attempts: bucket.attempts };
  }
  cleanup(now = Date.now()) { for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key); }
  get size() { return this.buckets.size; }
}
