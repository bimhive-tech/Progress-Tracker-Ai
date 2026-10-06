import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Router, type Request, type RequestHandler, type Response } from 'express';
import { z } from 'zod';
import { config, type Account, type Role } from './config.js';
import { HttpError } from './http.js';

/**
 * Sign-in with the accounts from config (TRACKER_ADMIN_* / TRACKER_VIEWER_* env vars).
 * Sessions are stateless signed cookies. The signature is keyed on the account's password,
 * so changing a password signs everyone on that account out.
 */

const COOKIE = 'tracker_session';
const SESSION_DAYS = 14;
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type SessionUser = { username: string; role: Role };

const digest = (value: string) => createHash('sha256').update(value).digest();
const sameText = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

function signature(account: Account, payload: string) {
  return createHmac('sha256', `${config.sessionSecret}:${account.username}:${account.password}`).update(payload).digest('base64url');
}

function issueToken(account: Account) {
  const payload = Buffer.from(JSON.stringify({ u: account.username, exp: Date.now() + SESSION_DAYS * 86_400_000 })).toString('base64url');
  return `${payload}.${signature(account, payload)}`;
}

function readCookie(req: Request, name: string) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index > -1 && part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return undefined;
}

function sessionUser(req: Request): SessionUser | null {
  const token = readCookie(req, COOKIE);
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { u?: unknown; exp?: unknown };
    const account = config.accounts.find((a) => a.username === data.u);
    if (!account || typeof data.exp !== 'number' || data.exp < Date.now()) return null;
    if (!sameText(sig, signature(account, payload))) return null;
    return { username: account.username, role: account.role };
  } catch {
    return null;
  }
}

function findAccount(username: string, password: string) {
  let match: Account | undefined;
  // Compare against every account so timing doesn't reveal which usernames exist.
  for (const account of config.accounts) {
    const userOk = sameText(account.username.toLowerCase(), username.trim().toLowerCase());
    const passOk = sameText(account.password, password);
    if (userOk && passOk) match = account;
  }
  return match;
}

function setSessionCookie(req: Request, res: Response, token: string | null) {
  const options = { httpOnly: true, sameSite: 'lax' as const, secure: req.secure, path: '/' };
  if (token) res.cookie(COOKIE, token, { ...options, maxAge: SESSION_DAYS * 86_400_000 });
  else res.clearCookie(COOKIE, options);
}

/* ------------------------------------------------------------------ Brute-force guard */

const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; until: number }>();

function checkLock(ip: string) {
  const entry = failures.get(ip);
  if (!entry) return;
  if (entry.until < Date.now()) {
    failures.delete(ip);
    return;
  }
  if (entry.count >= MAX_FAILURES) {
    const minutes = Math.ceil((entry.until - Date.now()) / 60_000);
    throw new HttpError(429, `Too many failed sign-ins. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  }
}

function recordFailure(ip: string) {
  const entry = failures.get(ip);
  if (entry && entry.until > Date.now()) entry.count++;
  else failures.set(ip, { count: 1, until: Date.now() + LOCK_MS });
  if (failures.size > 10_000) failures.clear();
}

/* ------------------------------------------------------------------ Routes */

export const authRouter = Router();

authRouter.post('/auth/login', (req, res) => {
  const ip = req.ip ?? 'unknown';
  checkLock(ip);
  const { username, password } = z.object({ username: z.string().max(200), password: z.string().max(500) }).parse(req.body);
  const account = findAccount(username, password);
  if (!account) {
    recordFailure(ip);
    throw new HttpError(401, 'Wrong username or password');
  }
  failures.delete(ip);
  setSessionCookie(req, res, issueToken(account));
  res.json({ username: account.username, role: account.role } satisfies SessionUser);
});

authRouter.post('/auth/logout', (req, res) => {
  setSessionCookie(req, res, null);
  res.status(204).end();
});

/** The signed-in account, or null (a 200, so the sign-in screen doesn't log an error on every visit). */
authRouter.get('/auth/me', (req, res) => {
  res.json(sessionUser(req));
});

/** Everything after this needs a session; anything that changes data needs the admin role. */
export const requireSession: RequestHandler = (req, res, next) => {
  const user = sessionUser(req);
  if (!user) return next(new HttpError(401, 'Please sign in'));
  if (!READ_METHODS.has(req.method) && user.role !== 'admin') return next(new HttpError(403, 'This account is view-only'));
  res.locals.user = user;
  next();
};
