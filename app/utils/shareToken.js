const crypto = require('crypto');

/**
 * Extract share code from param when full share text was passed
 * (e.g. "LJBTZQCP Shared from Ayuuto App http://.../view/LJBTZQCP" -> "LJBTZQCP")
 * Share codes are 8 chars, alphanumeric (base64url).
 */
function extractShareCode(param) {
  if (!param || typeof param !== 'string') return param || '';
  const s = param.trim();
  // If it contains "/view/", take the code after the last "/view/"
  const viewMatch = s.match(/\/view\/([A-Za-z0-9_-]+)/g);
  if (viewMatch && viewMatch.length > 0) {
    const last = viewMatch[viewMatch.length - 1];
    const code = last.replace(/^\/view\//, '').split(/[\s?&#]/)[0];
    if (code && /^[A-Za-z0-9_-]{6,20}$/.test(code)) return code;
  }
  // Otherwise take the first alphanumeric segment (share code format)
  const first = s.split(/[\s/]/)[0];
  if (first && /^[A-Za-z0-9_-]{6,20}$/.test(first)) return first;
  return s;
}

/**
 * Generate a secure, URL-safe share token
 * @returns {string} Base64URL encoded token
 */
function generateShareToken() {
  // Generate a secure, URL-safe token (32 bytes = 256 bits)
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a short, URL-friendly share code (8 characters)
 * @returns {string} Short share code
 */
function generateShareCode() {
  // Generate a short, URL-friendly code (6 bytes = 48 bits, base64url = 8 chars)
  return crypto.randomBytes(6).toString('base64url').substring(0, 8).toUpperCase();
}

/**
 * Generate a shareable link for a group (using shareCode, no token in URL)
 * @param {string} shareCode - The share code
 * @returns {string} Full shareable URL
 */
function generateShareLink(shareCode, req = null) {
  // If request object is provided, use it to generate the URL dynamically
  if (req) {
    const protocol = req.protocol;
    const host = req.get('host');
    // URL contains only shareCode, no token visible
    return `${protocol}://${host}/view/${shareCode}`;
  }
  
  // Fallback: Use env vars or DigitalOcean default
  const DIGITALOCEAN_URL = 'http://104.248.117.205';
  let baseUrl = (process.env.BACKEND_URL || process.env.FRONTEND_URL || process.env.WEB_VIEW_URL || DIGITALOCEAN_URL).replace(/\/$/, '');
  
  if (baseUrl.includes(':3000')) {
    const port = process.env.PORT || 5001;
    baseUrl = baseUrl.replace(/:3000/g, `:${port}`);
  }
  
  // URL contains only shareCode, no token
  return `${baseUrl}/view/${shareCode}`;
}

module.exports = { generateShareToken, generateShareCode, generateShareLink, extractShareCode };
