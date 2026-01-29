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
  
  // Fallback: Try to get URL from environment variables
  // Priority: BACKEND_URL > FRONTEND_URL > WEB_VIEW_URL > Auto-detect Railway > Default Railway URL
  let baseUrl = process.env.BACKEND_URL || process.env.FRONTEND_URL || process.env.WEB_VIEW_URL;
  
  // Auto-detect Railway URL (check multiple ways Railway exposes it)
  if (!baseUrl) {
    // Check for Railway environment variables
    const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN || 
                          process.env.RAILWAY_STATIC_URL ||
                          process.env.RAILWAY_TUNNEL_URL;
    
    if (railwayDomain) {
      // Railway provides domain, ensure it has https://
      baseUrl = railwayDomain.startsWith('http') ? railwayDomain : `https://${railwayDomain}`;
      console.log(`[ShareToken] ✅ Auto-detected Railway URL: ${baseUrl}`);
    } else if (process.env.RAILWAY_ENVIRONMENT) {
      // We're on Railway but no domain set - use known Railway URL
      baseUrl = 'https://web-production-40b9d.up.railway.app';
      console.log(`[ShareToken] ⚠️  Using default Railway URL (set BACKEND_URL in Railway for reliability): ${baseUrl}`);
    }
  }
  
  // Also check for other hosting platforms
  if (!baseUrl) {
    const host = process.env.RENDER_EXTERNAL_URL || 
                 process.env.HEROKU_APP_NAME;
    if (host) {
      baseUrl = host.startsWith('http') ? host : `https://${host}`;
      console.log(`[ShareToken] Auto-detected URL from platform: ${baseUrl}`);
    }
  }
  
  // Final check: if we're on Railway (detected by environment) but no URL, use default
  if (!baseUrl && (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME)) {
    baseUrl = 'https://web-production-40b9d.up.railway.app';
    console.log(`[ShareToken] ⚠️  WARNING: No BACKEND_URL set! Using default Railway URL: ${baseUrl}`);
    console.log(`[ShareToken] 💡 Set BACKEND_URL=https://web-production-40b9d.up.railway.app in Railway Variables for reliability`);
  }
  
  // If baseUrl contains port 3000 (common frontend port), replace with backend port
  if (baseUrl && baseUrl.includes(':3000')) {
    const port = process.env.PORT || 5001;
    console.warn(`[ShareToken] ⚠️  Base URL contains port 3000, replacing with backend port ${port}: ${baseUrl}`);
    baseUrl = baseUrl.replace(/:3000/g, `:${port}`);
  }
  
  // Development fallback: use local network IP (ONLY if not on Railway)
  if (!baseUrl && !process.env.RAILWAY_ENVIRONMENT && !process.env.RAILWAY_SERVICE_NAME) {
    const port = process.env.PORT || 5001;
    const localIP = process.env.LOCAL_SERVER_IP || '192.168.18.126';
    baseUrl = `http://${localIP}:${port}`;
    console.log(`[ShareToken] Using development URL: ${baseUrl}`);
  }
  
  // Safety check: NEVER use local IP if we're on Railway
  if (baseUrl && (baseUrl.includes('192.168.') || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_NAME) {
      console.error(`[ShareToken] ❌ ERROR: Local IP detected on Railway! Overriding with Railway URL.`);
      baseUrl = 'https://web-production-40b9d.up.railway.app';
    }
  }
  
  // Final check - ensure port is correct (remove port 3000 if present)
  if (baseUrl && baseUrl.includes(':3000')) {
    const port = process.env.PORT || 5001;
    console.warn(`[ShareToken] ⚠️  Base URL contains port 3000, removing: ${baseUrl}`);
    baseUrl = baseUrl.replace(/:3000/g, '');
  }
  
  // URL contains only shareCode, no token
  return `${baseUrl}/view/${shareCode}`;
}

module.exports = { generateShareToken, generateShareCode, generateShareLink, extractShareCode };
