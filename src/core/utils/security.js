import crypto from "crypto";

const rateLimitStore = new Map();
const tokenBlacklist = new Map();

export const normalizeIdentifier = (value) =>
  String(value || "").trim().toLowerCase();

export const recordRateLimit = (key, windowMs = 60_000, maxAttempts = 5) => {
  const now = Date.now();
  const current = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > current.resetAt) {
    current.count = 0;
    current.resetAt = now + windowMs;
  }

  if (current.count >= maxAttempts) {
    return false;
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return true;
};

export const clearRateLimit = (key) => {
  rateLimitStore.delete(key);
};

export const rateLimiter = ({ windowMs = 60_000, maxAttempts = 5, prefix = "auth" } = {}) => {
  return (req, res, next) => {
    const identifier = normalizeIdentifier(req.body?.email || req.ip || "unknown");
    const key = `${prefix}:${identifier}`;

    if (!recordRateLimit(key, windowMs, maxAttempts)) {
      return res.status(429).json({
        message: "Too many attempts. Please wait a little and try again.",
      });
    }

    req.rateLimitKey = key;
    return next();
  };
};

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const addTokenToBlacklist = (token, expiresAt) => {
  if (!token) return;
  tokenBlacklist.set(hashToken(token), {
    expiresAt: new Date(expiresAt).toISOString(),
  });
};

export const isTokenBlacklisted = (token) => {
  if (!token) return false;

  const entry = tokenBlacklist.get(hashToken(token));
  if (!entry) return false;

  const expired = new Date(entry.expiresAt).getTime() <= Date.now();
  if (expired) {
    tokenBlacklist.delete(hashToken(token));
    return false;
  }

  return true;
};
