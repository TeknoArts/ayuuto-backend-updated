const Group = require('../models/Group');
const User = require('../models/User');
const crypto = require('crypto');

// @desc    Generate invitation token for participant
// @route   POST /api/invite/generate
// @access  Private
exports.generateInviteToken = async (req, res, next) => {
  try {
    const { groupId, participantId } = req.body;

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    // Check authorization
    if (group.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only group admin can generate invitation links',
      });
    }

    // Find participant
    const participant = group.participants.id(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found',
      });
    }

    // Generate invitation token (expires in 7 days)
    const inviteToken = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store invitation token (you might want to create an Invitation model)
    // For now, we'll use a simple approach with the participant's user field
    // In production, consider creating an Invitation collection

    // Use local server IP for invitation links
    // IMPORTANT: Never use localhost - links are opened on different devices!
    const localIP = process.env.LOCAL_SERVER_IP || '192.168.18.126';
    const localPort = process.env.PORT || 5001;
    
    // Get base URL - prioritize environment variables, but ensure it's network-accessible
    let baseUrl = process.env.FRONTEND_URL || process.env.BACKEND_URL;
    
    // If baseUrl contains localhost, replace it with the network IP
    if (baseUrl && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
      console.warn(`[Invite] ⚠️  Base URL contains localhost, replacing with network IP: ${baseUrl}`);
      baseUrl = baseUrl.replace(/localhost|127\.0\.0\.1/g, localIP);
    }
    
    // If no baseUrl set, use network IP (never localhost)
    if (!baseUrl) {
      const requestHost = req.get('host');
      // Only use requestHost if it's NOT localhost and contains the network IP
      if (requestHost && !requestHost.includes('localhost') && !requestHost.includes('127.0.0.1') && requestHost.includes('192.168.18.126')) {
        baseUrl = `${req.protocol}://${requestHost}`;
      } else {
        baseUrl = `http://${localIP}:${localPort}`;
      }
    }
    
    // Final safety check - ensure baseUrl doesn't contain localhost
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      console.error(`[Invite] ❌ ERROR: Base URL still contains localhost: ${baseUrl}`);
      baseUrl = `http://${localIP}:${localPort}`;
    }
    
    const inviteUrl = `${baseUrl}/invite/${groupId}?token=${inviteToken}`;
    
    console.log(`[Invite] Generated invite URL: ${inviteUrl}`);
    console.log(`[Invite] Base URL used: ${baseUrl}`);

    res.status(200).json({
      success: true,
      data: {
        inviteUrl,
        inviteToken,
        expiresAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Handle invitation acceptance (web page that redirects to app)
// @route   GET /invite/:groupId
// @access  Public
exports.handleInvite = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { token } = req.query;

    // Validate token
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Invalid Invitation Link</h1>
          <p>The invitation link is invalid or has expired.</p>
        </body>
        </html>
      `);
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Group Not Found</title>
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Group Not Found</h1>
          <p>The group you're trying to join doesn't exist.</p>
        </body>
        </html>
      `);
    }

    // Validate token against stored tokens
    let validToken = false;
    let participantId = null;
    
    console.log(`[Invite] Validating token for group: ${groupId}`);
    console.log(`[Invite] Token provided: ${token ? 'Yes' : 'No'}`);
    console.log(`[Invite] Group has invite tokens: ${group.participantInviteTokens ? 'Yes' : 'No'}`);
    
    if (group.participantInviteTokens) {
      // Mongoose Maps - convert to regular Map or Object for iteration
      let tokensMap = group.participantInviteTokens;
      
      // Mongoose Map has a toObject method, but we can iterate directly
      // Handle both Map and Object formats
      let entries = [];
      
      if (tokensMap instanceof Map) {
        entries = Array.from(tokensMap.entries());
      } else if (tokensMap.toObject) {
        // Mongoose Map - convert to object
        const obj = tokensMap.toObject();
        entries = Object.entries(obj);
      } else if (typeof tokensMap === 'object') {
        entries = Object.entries(tokensMap);
      }
      
      console.log(`[Invite] Found ${entries.length} stored token(s)`);
      
      for (const [pid, tokenData] of entries) {
        // tokenData should be an object with token and expiresAt
        const storedToken = tokenData?.token;
        const expiresAt = tokenData?.expiresAt;
        
        console.log(`[Invite] Checking token for participant ${pid}: ${storedToken ? storedToken.substring(0, 10) + '...' : 'no token'}`);
        
        if (storedToken === token) {
          // Check if token has expired
          if (expiresAt && new Date() > new Date(expiresAt)) {
            console.log(`[Invite] Token expired for participant: ${pid}`);
            return res.status(400).send(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invitation Expired</title>
              </head>
              <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1>Invitation Expired</h1>
                <p>This invitation link has expired. Please contact the group admin for a new invitation.</p>
              </body>
              </html>
            `);
          }
          validToken = true;
          participantId = pid;
          console.log(`[Invite] ✅ Valid token found for participant: ${pid}`);
          break;
        }
      }
    } else {
      console.log(`[Invite] ⚠️  Group has no invite tokens stored`);
    }

    if (!validToken) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invalid Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Invalid Invitation Link</h1>
          <p>The invitation link is invalid or has expired.</p>
        </body>
        </html>
      `);
    }

    // Get app store URLs (update these with your actual app store links)
    const iosAppStoreUrl = process.env.IOS_APP_STORE_URL || 'https://apps.apple.com/app/ayuuto/idYOUR_APP_ID';
    const androidPlayStoreUrl = process.env.ANDROID_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.technoarts.ayuuto';
    
    // Deep link URL
    const deepLinkUrl = `ayuuto://group/${groupId}?invite=true&token=${token}`;
    
    // Use local server for links (development)
    // IMPORTANT: Never use localhost - links are opened on different devices!
    const localIP = process.env.LOCAL_SERVER_IP || '192.168.18.126';
    const localPort = process.env.PORT || 5001;
    
    // Get base URL - prioritize environment variables, but ensure it's network-accessible
    let baseUrl = process.env.FRONTEND_URL || process.env.BACKEND_URL;
    
    // If baseUrl contains localhost, replace it with the network IP
    if (baseUrl && (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1'))) {
      console.warn(`[Invite] ⚠️  Base URL contains localhost, replacing with network IP: ${baseUrl}`);
      baseUrl = baseUrl.replace(/localhost|127\.0\.0\.1/g, localIP);
    }
    
    // If baseUrl contains port 3000 (common frontend port), replace with backend port 5001
    if (baseUrl && baseUrl.includes(':3000')) {
      console.warn(`[Invite] ⚠️  Base URL contains port 3000 (frontend), replacing with backend port ${localPort}: ${baseUrl}`);
      baseUrl = baseUrl.replace(/:3000/g, `:${localPort}`);
    }
    
    // If no baseUrl set, use network IP (never localhost)
    if (!baseUrl) {
      const requestHost = req.get('host');
      // Only use requestHost if it's NOT localhost and has correct port
      if (requestHost && !requestHost.includes('localhost') && !requestHost.includes('127.0.0.1') && !requestHost.includes(':3000')) {
        baseUrl = `${req.protocol}://${requestHost}`;
      } else {
        baseUrl = `http://${localIP}:${localPort}`;
      }
    }
    
    // Final safety check - ensure baseUrl doesn't contain localhost or wrong port
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes(':3000')) {
      console.error(`[Invite] ❌ ERROR: Base URL contains invalid value (localhost or port 3000): ${baseUrl}`);
      baseUrl = `http://${localIP}:${localPort}`;
    }
    
    const universalLink = `${baseUrl}/group/${groupId}?invite=true&token=${token}`;
    
    console.log(`[Invite] Generated universal link: ${universalLink}`);
    console.log(`[Invite] Base URL used: ${baseUrl}`);

    // Detect user agent
    const userAgent = req.headers['user-agent'] || '';
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);

    // HTML page that tries to open app, then redirects to app store
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Join ${group.name} on Ayuuto</title>
        <meta name="apple-itunes-app" content="app-id=YOUR_APP_ID">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #001327 0%, #002244 100%);
            color: #FFFFFF;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          .logo {
            font-size: 48px;
            font-weight: bold;
            color: #FFD700;
            margin-bottom: 20px;
            letter-spacing: 2px;
          }
          h1 {
            font-size: 24px;
            margin-bottom: 16px;
            color: #FFFFFF;
          }
          p {
            font-size: 16px;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 30px;
            line-height: 1.6;
          }
          .group-name {
            font-size: 20px;
            font-weight: bold;
            color: #FFD700;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            background-color: #4CAF50;
            color: #FFFFFF;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 12px;
            font-weight: bold;
            font-size: 18px;
            margin: 10px;
            transition: background-color 0.3s;
          }
          .button:hover {
            background-color: #45a049;
          }
          .button-secondary {
            background-color: #002452;
            border: 2px solid #FFD700;
          }
          .button-secondary:hover {
            background-color: #003366;
          }
          .spinner {
            border: 4px solid rgba(255, 255, 255, 0.1);
            border-top: 4px solid #FFD700;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .app-stores {
            margin-top: 30px;
            display: flex;
            flex-direction: column;
            gap: 15px;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🔄 AYUUTO</div>
          <h1>Join the Group</h1>
          <div class="group-name">${group.name}</div>
          <p>Opening Ayuuto app...</p>
          <div class="spinner"></div>
          
          <div class="app-stores" id="app-stores" style="display: none;">
            <p>Don't have the app? Download it now:</p>
            ${isIOS ? `
              <a href="${iosAppStoreUrl}" class="button">
                Download on App Store
              </a>
            ` : ''}
            ${isAndroid ? `
              <a href="${androidPlayStoreUrl}" class="button">
                Get it on Google Play
              </a>
            ` : ''}
            ${!isIOS && !isAndroid ? `
              <a href="${iosAppStoreUrl}" class="button">iOS App Store</a>
              <a href="${androidPlayStoreUrl}" class="button">Google Play Store</a>
            ` : ''}
          </div>
        </div>

        <script>
          // Try to open app via deep link
          const deepLinkUrl = '${deepLinkUrl}';
          const universalLink = '${universalLink}';
          const iosAppStoreUrl = '${iosAppStoreUrl}';
          const androidPlayStoreUrl = '${androidPlayStoreUrl}';
          const isIOS = ${isIOS};
          const isAndroid = ${isAndroid};

          // Function to redirect to app store
          function redirectToAppStore() {
            const appStores = document.getElementById('app-stores');
            appStores.style.display = 'flex';
            
            // Auto-redirect after 2 seconds
            setTimeout(() => {
              if (isIOS) {
                window.location.href = iosAppStoreUrl;
              } else if (isAndroid) {
                window.location.href = androidPlayStoreUrl;
              }
            }, 2000);
          }

          // Try universal link first (works better on iOS)
          if (isIOS) {
            window.location.href = universalLink;
            
            // Fallback: if app doesn't open in 2 seconds, show app store
            setTimeout(() => {
              redirectToAppStore();
            }, 2000);
          } else {
            // For Android, try deep link
            window.location.href = deepLinkUrl;
            
            // Fallback: if app doesn't open in 2 seconds, show app store
            setTimeout(() => {
              redirectToAppStore();
            }, 2000);
          }

          // Also try opening deep link in a hidden iframe (for better compatibility)
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = deepLinkUrl;
          document.body.appendChild(iframe);

          // Remove iframe after attempt
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        </script>
      </body>
      </html>
    `;

    res.send(html);
  } catch (err) {
    console.error('[Invite] ❌ Error handling invite:', err);
    console.error('[Invite] Error stack:', err.stack);
    console.error('[Invite] Error details:', {
      message: err.message,
      name: err.name,
      groupId: req.params.groupId,
      token: req.query.token ? 'provided' : 'missing'
    });
    
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>Error</h1>
        <p>An error occurred while processing your invitation.</p>
        ${process.env.NODE_ENV === 'development' ? `
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            Error: ${err.message}
          </p>
        ` : ''}
      </body>
      </html>
    `);
  }
};
