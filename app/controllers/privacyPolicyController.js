// @desc    Serve Privacy Policy HTML page
// @route   GET /privacy-policy
// @access  Public
exports.servePrivacyPolicy = (req, res) => {
  try {
    // Get the current host and protocol for proper URL generation
    const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'https';
    const host = req.get('host') || req.get('X-Forwarded-Host') || '104.248.117.205';
    
    // Use BACKEND_URL if available, else derive from request
    const baseUrl = process.env.BACKEND_URL || `${protocol}://${host}`;

    // Generate HTML with inline CSS - matches app design
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Ayuuto App Privacy Policy">
    <meta name="robots" content="index, follow">
    <title>Privacy Policy - Ayuuto App</title>
    <meta name="theme-color" content="#011b3d">
    <style>
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background-color: rgb(1, 27, 61);
    color: #E0E0E0;
    line-height: 1.6;
    padding: 20px;
    max-width: 800px;
    margin: 0 auto;
}

.container {
    background-color: #001b3d;
    border-radius: 16px;
    padding: 40px;
    margin: 20px 0;
    border: 1px solid #1a2332;
}

.header {
    text-align: center;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 2px solid #FFD700;
}

.main-title {
    font-size: 32px;
    font-weight: bold;
    color: #FFD700;
    margin-bottom: 8px;
    letter-spacing: 1px;
}

.app-name {
    font-size: 20px;
    font-weight: 600;
    color: #FFFFFF;
    margin-bottom: 16px;
    letter-spacing: 0.5px;
}

.last-updated {
    font-size: 14px;
    color: #9BA1A6;
    margin-top: 12px;
}

.section {
    margin-bottom: 32px;
}

.section-title {
    font-size: 22px;
    font-weight: bold;
    color: #FFD700;
    margin-bottom: 16px;
    letter-spacing: 0.5px;
}

.section-text {
    font-size: 16px;
    line-height: 24px;
    color: #E0E0E0;
    margin-bottom: 12px;
}

.bullet-point {
    font-size: 16px;
    line-height: 24px;
    color: #E0E0E0;
    margin-left: 24px;
    margin-bottom: 8px;
    list-style: none;
    position: relative;
}

.bullet-point:before {
    content: "•";
    color: #FFD700;
    font-weight: bold;
    position: absolute;
    left: -20px;
}

.contact-info {
    font-size: 16px;
    line-height: 24px;
    color: #FFD700;
    margin-top: 12px;
    font-weight: 600;
}

.footer {
    text-align: center;
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #1a2332;
    color: #9BA1A6;
    font-size: 14px;
}

@media (max-width: 600px) {
    body {
        padding: 10px;
    }
    
    .container {
        padding: 20px;
    }
    
    .main-title {
        font-size: 24px;
    }
    
    .section-title {
        font-size: 20px;
    }
    
    .section-text,
    .bullet-point {
        font-size: 14px;
    }
}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="main-title">Privacy Policy</h1>
            <div class="app-name">Ayuuto APP</div>
            <div class="last-updated">Last updated: 01 Jan 2026</div>
        </div>

        <div class="section">
            <p class="section-text">
                Ayuuto App respects your privacy. This Privacy Policy explains what information we collect, how we use it, and how we protect it.
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">1. Information We Collect</h2>
            <p class="section-text">
                Ayuuto App only collects the minimum information required for the app to function.
            </p>
            <p class="section-text">
                We collect the following personal data:
            </p>
            <div class="bullet-point">First name</div>
            <div class="bullet-point">Last name</div>
            <div class="bullet-point">Email address</div>
            <div class="bullet-point">Phone number</div>
            <p class="section-text">
                No other personal data is collected or processed.
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">2. How We Use Your Information</h2>
            <p class="section-text">
                Your information is used solely to:
            </p>
            <div class="bullet-point">Identify users within savings groups</div>
            <div class="bullet-point">Enable group organization and communication</div>
            <div class="bullet-point">Ensure clarity and trust between participants</div>
            <p class="section-text">
                Ayuuto App does not use your data for marketing, advertising, or analytics.
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">3. No Financial Data</h2>
            <p class="section-text">
                Ayuuto App does not handle, store, or process any money or financial transactions.
            </p>
            <p class="section-text">
                All savings arrangements and payments take place outside the app, directly between users.
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">4. Data Storage and Hosting</h2>
            <p class="section-text">
                All data is securely stored on cloud servers (DigitalOcean).
            </p>
            <p class="section-text">
                We take reasonable technical and organizational measures to protect your information from unauthorized access, loss, or misuse.
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">5. Third-Party Services</h2>
            <p class="section-text">
                Ayuuto App does not share your personal data with third parties.
            </p>
            <p class="section-text">
                No external tools or services process user data beyond our cloud hosting provider.
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">6. Data Retention</h2>
            <p class="section-text">
                Your data is stored only for as long as you use the Ayuuto App.
            </p>
            <p class="section-text">
                If you stop using the app or request deletion, your personal data will be removed within a reasonable time.
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">7. Your Rights</h2>
            <p class="section-text">
                You have the right to:
            </p>
            <div class="bullet-point">Access the personal data we hold about you</div>
            <div class="bullet-point">Request correction of inaccurate information</div>
            <div class="bullet-point">Request deletion of your data</div>
            <p class="section-text">
                To exercise these rights, contact us using the details below.
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">8. Children's Privacy</h2>
            <p class="section-text">
                Ayuuto App is not intended for use by children under the age of 13.
            </p>
            <p class="section-text">
                We do not knowingly collect personal data from children.
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">9. Changes to This Privacy Policy</h2>
            <p class="section-text">
                We may update this Privacy Policy from time to time.
            </p>
            <p class="section-text">
                Any changes will be published on this page with an updated revision date.
            </p>
        </div>

        <div class="section">
            <h2 class="section-title">10. Contact Information</h2>
            <p class="section-text">
                If you have questions about this Privacy Policy or how your data is handled, please contact us:
            </p>
            <div class="contact-info">Email: hello@ayuuto.app</div>
        </div>

        <div class="footer">
            <p>&copy; 2026 Ayuuto App. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

    // Set headers to prevent caching and ensure it's publicly accessible
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-Robots-Tag': 'index, follow', // Allow search engines to index
    });
    
    res.send(html);
  } catch (err) {
    console.error('Error serving privacy policy:', err);
    res.status(500).send('Error loading privacy policy page');
  }
};
