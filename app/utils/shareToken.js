const crypto = require('crypto');

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
  
  // Fallback: Try to get frontend URL from environment
  let baseUrl = process.env.FRONTEND_URL || process.env.WEB_VIEW_URL;
  
  // If baseUrl contains port 3000 (common frontend port), replace with backend port 5001
  if (baseUrl && baseUrl.includes(':3000')) {
    const port = process.env.PORT || 5001;
    console.warn(`[ShareToken] ⚠️  Base URL contains port 3000, replacing with backend port ${port}: ${baseUrl}`);
    baseUrl = baseUrl.replace(/:3000/g, `:${port}`);
  }
  
  // If not set, use local server IP for development
  if (!baseUrl) {
    const port = process.env.PORT || 5001;
    if (process.env.NODE_ENV === 'production') {
      // In production, you should set FRONTEND_URL or use your domain
      baseUrl = process.env.BACKEND_URL || `https://your-domain.com`;
    } else {
      // Development: use local server IP
      const localIP = process.env.LOCAL_SERVER_IP || '192.168.18.126';
      baseUrl = `http://${localIP}:${port}`;
    }
  }
  
  // Final check - ensure port is correct (5001, not 3000)
  if (baseUrl && baseUrl.includes(':3000')) {
    const port = process.env.PORT || 5001;
    console.error(`[ShareToken] ❌ ERROR: Base URL still contains port 3000: ${baseUrl}`);
    const localIP = process.env.LOCAL_SERVER_IP || '192.168.18.126';
    baseUrl = `http://${localIP}:${port}`;
  }
  
  // URL contains only shareCode, no token
  return `${baseUrl}/view/${shareCode}`;
}

module.exports = { generateShareToken, generateShareCode, generateShareLink };
