import { SignJWT, jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

export interface TokenPayload {
  userId?: string
  email: string
  name?: string
  role?: string
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'saboo-cug-fallback-secret-change-in-production'
  )
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as TokenPayload
  } catch {
    return null
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get('auth-token')?.value ?? null
}
