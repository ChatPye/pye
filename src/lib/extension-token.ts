import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-for-development';

export interface ExtensionTokenPayload {
  userId: string;
  email: string;
  tier: 'free' | 'pro' | 'enterprise';
  role?: string;
  installId?: string;
  exp?: number;
}

// Back-compat simple signer
export function generateExtensionToken(payload: ExtensionTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

// New signature used by API route
export async function generateExtensionTokenForInstall(
  user: { id: string; email: string; subscription?: { tier: 'free' | 'pro' | 'enterprise' } },
  installId: string,
  hours: number
): Promise<string> {
  const payload: ExtensionTokenPayload = {
    userId: user.id,
    email: user.email,
    tier: user.subscription?.tier ?? 'free',
    installId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${hours}h` });
}

export async function verifyExtensionToken(token: string): Promise<ExtensionTokenPayload | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as ExtensionTokenPayload;
    return payload;
  } catch (error) {
    console.error('Invalid extension token:', error);
    return null;
  }
}

// Simple in-memory handshake code store
const handshakeStore = new Map<string, { userId: string; expiresAt: number }>();

export function generateHandshakeCode(): string {
  const code = Math.random().toString(36).slice(2, 10);
  return code;
}

export function storeHandshakeCode(code: string, userId: string, minutes: number): void {
  const expiresAt = Date.now() + minutes * 60 * 1000;
  handshakeStore.set(code, { userId, expiresAt });
}

export function consumeHandshakeCode(code: string): string | null {
  const entry = handshakeStore.get(code);
  if (!entry) return null;
  handshakeStore.delete(code);
  if (Date.now() > entry.expiresAt) return null;
  return entry.userId;
}