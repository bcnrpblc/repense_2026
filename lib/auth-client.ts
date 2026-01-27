// ============================================================================
// CLIENT-SIDE TOKEN UTILITIES
// ============================================================================
// Client-safe token utilities using pure JavaScript (no Node.js dependencies)
// These functions decode JWT tokens without verification - server always verifies
// ============================================================================

import type { TokenPayload } from './auth-types';

/**
 * Decode base64url string to regular base64
 * JWT uses base64url encoding which replaces + with - and / with _
 */
function base64UrlDecode(str: string): string {
  // Replace URL-safe characters with standard base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  const pad = base64.length % 4;
  if (pad) {
    base64 += '='.repeat(4 - pad);
  }
  
  return base64;
}

/**
 * Decode a JWT token without verification (client-side use only)
 * This is useful for reading token payload on the client
 * 
 * WARNING: Do not trust the output - always verify on the server
 * This function only decodes the payload, it does NOT verify the signature
 * 
 * @param token - The JWT token string
 * @returns The decoded payload or null if invalid
 * 
 * @example
 * ```ts
 * const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
 * const payload = decodeToken(token);
 * if (payload && 'adminId' in payload) {
 *   console.log('Admin ID:', payload.adminId);
 * }
 * ```
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    // JWT tokens have three parts: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    const base64 = base64UrlDecode(payload);
    
    // Decode base64 to string, then parse JSON
    const decoded = JSON.parse(atob(base64));
    
    return decoded as TokenPayload;
  } catch {
    // If decoding fails, return null
    return null;
  }
}

/**
 * Check if a token is expired (client-side check)
 * 
 * This function reads the `exp` (expiration) claim from the token payload
 * and compares it to the current time. Note that this is a client-side check
 * and should not be relied upon for security - the server always verifies.
 * 
 * @param token - The JWT token string
 * @returns true if expired, false if valid (or if exp claim is missing)
 * 
 * @example
 * ```ts
 * const token = getStoredToken();
 * if (token && !isTokenExpired(token)) {
 *   // Token appears to be valid (but server will verify)
 * }
 * ```
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    
    if (!decoded || typeof decoded !== 'object') {
      return true;
    }

    // Check if token has exp claim
    // exp is in seconds since Unix epoch
    const exp = (decoded as { exp?: number }).exp;
    
    if (!exp || typeof exp !== 'number') {
      return true; // No expiration claim means treat as expired
    }

    // exp is in seconds, Date.now() is in milliseconds
    // Compare expiration time (in ms) with current time
    return exp * 1000 < Date.now();
  } catch {
    // If anything fails, treat as expired
    return true;
  }
}
