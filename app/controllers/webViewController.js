const path = require('path');
const fs = require('fs');
const { extractShareCode } = require('../utils/shareToken');

// @desc    Serve web view HTML page
// @route   GET /view/:shareCode
// @access  Public
exports.serveGroupView = (req, res) => {
  try {
    // Decode shareCode in case it was URL encoded
    let { shareCode } = req.params;
    shareCode = decodeURIComponent(shareCode);
    // Extract only the code when full share text was passed (e.g. "LJBTZQCP Shared from Ayuuto App http://.../view/LJBTZQCP")
    shareCode = extractShareCode(shareCode);
    
    // Normalize shareCode to uppercase (share codes are stored in uppercase)
    shareCode = shareCode.toUpperCase().trim();
    
    console.log(`[WebView] Serving group view for shareCode: ${shareCode}`);

    // Use BACKEND_URL in production (e.g. DigitalOcean: http://YOUR_IP or https://your-domain.com)
    const protocol = req.get('X-Forwarded-Proto') || req.protocol || 'https';
    const host = req.get('host') || req.get('X-Forwarded-Host') || 'localhost';
    
    let apiBaseUrl;
    if (process.env.BACKEND_URL) {
      apiBaseUrl = `${process.env.BACKEND_URL.replace(/\/$/, '')}/api/public`;
    } else {
      apiBaseUrl = `${protocol}://${host}/api/public`;
    }
    
    console.log(`[WebView] API Base URL: ${apiBaseUrl}`);

    // Generate HTML with inline CSS and JS - Pixel perfect match to mobile app
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <meta name="description" content="View Ayuuto Group Details">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
    <title>Ayuuto Group View</title>
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
    color: #FFFFFF;
    min-height: 100vh;
    padding: 20px;
    padding-bottom: 100px;
}

.hidden {
    display: none !important;
}

.loading {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 60px 20px;
}

.loading-text {
    color: #FFFFFF;
    font-size: 16px;
    margin-top: 20px;
}

.spinner {
    border: 4px solid rgba(255, 255, 255, 0.1);
    border-top: 4px solid #FFD700;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.error {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 60px 20px;
    text-align: center;
}

.error-icon {
    font-size: 64px;
    margin-bottom: 20px;
}

.error h2 {
    font-size: 24px;
    color: #FFFFFF;
    margin-bottom: 16px;
}

.error-message {
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 12px;
    font-weight: 500;
}

.error-hint {
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    margin-bottom: 24px;
    line-height: 1.4;
}

.error button {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
    font-weight: 600;
}

.group-content {
    max-width: 600px;
    margin: 0 auto;
}

.group-name-container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px;
    padding: 0 20px;
}

.group-name {
    font-size: 18px;
    font-weight: bold;
    color: #FFD700;
    letter-spacing: 1px;
    text-align: center;
    text-transform: uppercase;
    line-height: 1.4;
}

.savings-card {
    background-color: #001b3d;
    border-radius: 16px;
    border: 2px solid #FFD700;
    padding: 20px;
    margin-bottom: 20px;
}

.savings-card-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
}

.savings-title {
    font-size: 24px;
    font-weight: bold;
    color: #FFD700;
    letter-spacing: 1px;
}

.completed-badge {
    background-color: #002452;
    padding: 6px 12px;
    border-radius: 12px;
}

.completed-text {
    color: #FFFFFF;
    font-size: 12px;
    font-weight: bold;
    letter-spacing: 0.5px;
}

.savings-amount-section {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.amount-left {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
}

.amount-icon {
    width: 40px;
    height: 40px;
    color: #FFD700;
}

.amount-text {
    font-size: 48px;
    font-weight: bold;
    color: #FFFFFF;
}

.next-recipient {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
}

.next-recipient-label {
    font-size: 12px;
    font-weight: 600;
    color: #FFFFFF;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
}

.next-recipient-value {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
}

.next-recipient-name {
    font-size: 18px;
    font-weight: bold;
    color: #4CAF50;
}

.question-marks {
    font-size: 18px;
    font-weight: bold;
    color: #4CAF50;
}

.progress-indicator {
    display: flex;
    flex-direction: row;
    gap: 4px;
    align-items: center;
}

.progress-bar-segment {
    width: 20px;
    height: 8px;
    background-color: #4CAF50;
    border-radius: 4px;
}

.collection-day-container {
    margin-top: 8px;
}

.collection-day {
    font-size: 14px;
    font-weight: 600;
    color: #FFFFFF;
    letter-spacing: 0.5px;
}


.payment-section {
    margin-top: 8px;
}

.payment-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.payment-title {
    font-size: 18px;
    font-weight: bold;
    color: #FFD700;
    letter-spacing: 1px;
}

.participants-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.participant-card {
    background-color: #002452;
    border-radius: 12px;
    border: 1px solid #9BA1A6;
    padding: 16px;
}

.participant-card-paid {
    border-color: #90EE90;
}

.participant-top-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.participant-left {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.order-number {
    width: 28px;
    height: 28px;
    min-width: 28px;
    border-radius: 14px;
    background-color: #9BA1A6;
    display: flex;
    align-items: center;
    justify-content: center;
}

.order-number-paid {
    background-color: #90EE90;
}

.order-number-text {
    font-size: 12px;
    font-weight: bold;
    color: #FFFFFF;
}

.participant-name {
    font-size: 16px;
    font-weight: 600;
    color: #FFFFFF;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.paid-out-tag-inline {
    background-color: #90EE90;
    border-radius: 6px;
    padding: 6px 12px;
    margin-left: 8px;
}

.paid-out-tag-right {
    background-color: #90EE90;
    border-radius: 6px;
    padding: 6px 12px;
}

.paid-out-text-inline {
    font-size: 12px;
    color: #FFFFFF;
    font-weight: bold;
    letter-spacing: 0.5px;
}

.payment-status-container {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 8px;
}

.payment-status {
    font-size: 14px;
    color: #687c97;
    font-weight: 600;
}

.paid-status {
    font-size: 14px;
    color: #4CAF50;
    font-weight: 600;
}

.pay-now-button {
    background-color: #4CAF50;
    border-radius: 8px;
    padding: 12px 20px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-top: 8px;
}

.pay-now-button-text {
    color: #FFFFFF;
    font-size: 16px;
    font-weight: bold;
    letter-spacing: 0.5px;
}

.logs-section {
    margin-top: 24px;
}

.logs-header {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.logs-title {
    font-size: 16px;
    font-weight: bold;
    color: #FFD700;
    letter-spacing: 1px;
}

.logs-list {
    margin-top: 4px;
}

.log-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #1a2332;
}

.log-left {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex: 1;
    gap: 8px;
}

.log-icon {
    width: 28px;
    height: 28px;
    border-radius: 14px;
    background-color: #14304a;
    display: flex;
    align-items: center;
    justify-content: center;
}

.log-icon svg {
    width: 18px;
    height: 18px;
    color: #4CAF50;
}

.log-text-container {
    flex: 1;
}

.log-main-text {
    font-size: 14px;
    color: #FFFFFF;
    font-weight: 600;
}

.log-sub-text {
    font-size: 12px;
    color: #9BA1A6;
    margin-top: 2px;
}

.log-time-text {
    font-size: 11px;
    color: #687c97;
    margin-left: 8px;
}

.logs-empty-state {
    padding: 12px 0;
}

.logs-empty-text {
    font-size: 13px;
    color: #9BA1A6;
}

.completion-card {
    background-color: #04263b;
    border-radius: 16px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-top: 24px;
    margin-bottom: 20px;
}

.completion-icon {
    width: 60px;
    height: 60px;
    color: #FFD700;
}

.completion-title-ayuuto {
    font-size: 24px;
    font-weight: bold;
    color: #FFFFFF;
    letter-spacing: 2px;
    margin-top: 16px;
    text-align: center;
}

.completion-title-completed {
    font-size: 28px;
    font-weight: bold;
    color: #4CAF50;
    letter-spacing: 2px;
    margin-top: 4px;
    margin-bottom: 12px;
    text-align: center;
}

.completion-message {
    font-size: 16px;
    color: #FFFFFF;
    text-align: center;
    letter-spacing: 0.5px;
    line-height: 24px;
}

.open-in-app-container {
    margin-top: 24px;
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
}

.open-in-app-btn {
    background-color: #FFD700;
    color: #011b3d;
    border: none;
    border-radius: 12px;
    padding: 14px 24px;
    font-size: 16px;
    font-weight: bold;
    letter-spacing: 0.5px;
    cursor: pointer;
}

.open-in-app-btn:hover {
    opacity: 0.9;
}

@media (max-width: 600px) {
    body {
        padding: 20px;
    }
    
    .savings-amount-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
    }
    
    .next-recipient {
        align-items: flex-start;
    }
}
    </style>
</head>
<body>
    <div id="loading" class="loading">
        <div class="spinner"></div>
        <p class="loading-text">Loading...</p>
    </div>

    <div id="error" class="error hidden">
        <div class="error-icon">⚠️</div>
        <h2>Unable to Load Group</h2>
        <p class="error-message" id="error-message"></p>
        <p class="error-hint">The share code may be invalid, sharing may be disabled for this group, or the link may have expired. Ask the group admin to send a new share link.</p>
        <button onclick="location.reload()">Try Again</button>
    </div>

    <div id="group-content" class="group-content hidden">
        <div class="group-name-container">
            <div class="group-name" id="group-name"></div>
        </div>

        <div class="savings-card">
            <div class="savings-card-header">
                <div class="savings-title">SAVINGS</div>
                <div id="badge-container"></div>
            </div>

            <div class="savings-amount-section">
                <div class="amount-left">
                    <svg class="amount-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/>
                    </svg>
                    <div class="amount-text" id="amount-text">0</div>
                </div>
                <div class="next-recipient">
                    <div class="next-recipient-label">NEXT RECIPIENT</div>
                    <div class="next-recipient-value" id="next-recipient-value"></div>
                </div>
            </div>

            <div class="collection-day-container">
                <div class="collection-day" id="collection-day"></div>
            </div>
        </div>

        <div class="payment-section">
            <div class="payment-header">
                <div class="payment-title">PAYMENT STATUS</div>
            </div>

            <div class="participants-list" id="participants-list"></div>
        </div>

        <div class="logs-section">
            <div class="logs-header">
                <div class="logs-title">GROUP ACTIVITY</div>
            </div>
            <div id="logs-container"></div>
        </div>

        <div id="completion-card" class="completion-card hidden">
            <svg class="completion-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
            </svg>
            <div class="completion-title-ayuuto">AYUUTO</div>
            <div class="completion-title-completed">COMPLETED</div>
            <div class="completion-message">ALL MEMBERS HAVE BEEN PAID OUT SAFELY</div>
        </div>

        <div id="open-in-app-container" class="open-in-app-container hidden">
            <button type="button" id="open-in-app-btn" class="open-in-app-btn">Open in Ayuuto App</button>
        </div>
    </div>

    <script>
// Use same origin as the page so fetch works (avoids wrong protocol/host from proxy)
const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? window.location.origin + '/api/public'
  : '${apiBaseUrl}';
const shareCode = '${shareCode}';
let groupId = null;
let deepLinkAttempted = false;

// Function to try deep linking to app
function tryDeepLink() {
    if (!groupId || deepLinkAttempted) return;
    
    deepLinkAttempted = true;
    const deepLinkUrl = \`ayuuto://group/\${groupId}\`;
    
    // Detect device type
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isAndroid = /android/i.test(userAgent);
    
    if (isIOS || isAndroid) {
        console.log('Attempting to open app with deep link:', deepLinkUrl);
        // Try to open app
        window.location.href = deepLinkUrl;
        
        // If app doesn't open, we'll continue showing the web view
        // (no need to hide it, just let it load)
    }
}

async function loadGroup() {
    try {
        showLoading();
        
        if (!shareCode) {
            throw new Error('Share code is missing. Please check the share link.');
        }
        
        const encodedShareCode = encodeURIComponent(shareCode);
        const apiUrl = \`\${API_BASE_URL}/groups/view/\${encodedShareCode}?t=\${Date.now()}\`;
        
        console.log('Loading group with shareCode:', shareCode);
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
            cache: 'no-store', // Prevent caching - use no-store instead of no-cache
        });

        if (!response.ok) {
            let errorMessage = 'Unknown error occurred';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || \`Failed to load group (Status: \${response.status})\`;
                console.error('API Error Response:', errorData);
            } catch (e) {
                errorMessage = \`Failed to load group (Status: \${response.status})\`;
                console.error('Failed to parse error response:', e);
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        
        if (!data.success || !data.data || !data.data.group) {
            throw new Error('Invalid response from server');
        }
        
        // Store groupId for deep linking (user can tap "Open in App" instead of auto-redirect)
        if (data.data.group && data.data.group.id) {
            groupId = data.data.group.id;
        }
        
        renderGroup(data.data.group);
        hideLoading();
        if (document.visibilityState === 'visible') startRealtime();
    } catch (error) {
        console.error('Error loading group:', error);
        showError(error.message || 'Failed to load group. Please check the link and try again.');
        hideLoading();
    }
}

// Helper function to format participant name (extract part before @ if email)
function formatParticipantName(name) {
    if (!name) return '';
    if (name.includes('@')) {
        const emailParts = name.split('@');
        return emailParts[0] || name;
    }
    return name;
}

function renderGroup(group) {
    if (!group) return;
    // Single source of truth for completion (API sends isCompleted/status; participants may have hasReceivedPayment hidden by share settings)
    const isCompleted = group.isCompleted === true ||
        (group.status && String(group.status) === 'COMPLETED') ||
        (group.participants && group.participants.length > 0 && group.participants.every(function(p) { return p.hasReceivedPayment === true; }));
    
    // Group name
    document.getElementById('group-name').textContent = (group.name || '').toUpperCase();
    
    // Calculate total savings
    const totalSavings = group.amountPerPerson && group.memberCount 
        ? group.amountPerPerson * group.memberCount 
        : 0;
    document.getElementById('amount-text').textContent = totalSavings.toString();
    
    // Badge (completed only)
    const badgeContainer = document.getElementById('badge-container');
    if (isCompleted) {
        badgeContainer.innerHTML = '<div class="completed-badge"><div class="completed-text">COMPLETED</div></div>';
    } else {
        badgeContainer.innerHTML = '';
    }
    
    // Next recipient
    const nextRecipientEl = document.getElementById('next-recipient-value');
    if (isCompleted) {
        const progressBars = group.participants ? group.participants.map(function() { return '<div class="progress-bar-segment"></div>'; }).join('') : '';
        nextRecipientEl.innerHTML = '<div class="progress-indicator">' + progressBars + '</div>';
    } else if (group.rounds && group.rounds.length > 0 && group.rounds[0].recipient) {
        const recipientName = formatParticipantName(group.rounds[0].recipient.name);
        nextRecipientEl.innerHTML = '<div class="next-recipient-name">' + escapeHtml(recipientName.toUpperCase()) + '</div>';
    } else {
        nextRecipientEl.innerHTML = '<div class="question-marks">???</div>';
    }
    
    // Collection day
    const collectionDay = group.collectionDate || 2;
    document.getElementById('collection-day').textContent = 'COLLECTION DAY: ' + collectionDay;
    
    // Participants (pass isCompleted so PAID OUT shows even when share settings hide hasReceivedPayment)
    if (group.participants && group.participants.length > 0) {
        renderParticipants(group.participants, group, isCompleted);
    }
    
    // Activity logs
    if (group.activityLog && group.activityLog.length > 0) {
        renderLogs(group.activityLog);
    } else {
        document.getElementById('logs-container').innerHTML = '<div class="logs-empty-state"><div class="logs-empty-text">No activity yet</div></div>';
    }
    
    // Completion card - show "AYUUTO COMPLETED" when group is completed; hide when not
    const completionCard = document.getElementById('completion-card');
    if (isCompleted) {
        completionCard.classList.remove('hidden');
    } else {
        completionCard.classList.add('hidden');
    }
    
    // Show "Open in App" only on mobile when we have groupId
    const openInAppEl = document.getElementById('open-in-app-container');
    const ua = navigator.userAgent || navigator.vendor || '';
    const isMobile = /iPad|iPhone|iPod|android/i.test(ua);
    if (openInAppEl) {
        if (groupId && isMobile) {
            openInAppEl.classList.remove('hidden');
        } else {
            openInAppEl.classList.add('hidden');
        }
    }
    
    document.getElementById('group-content').classList.remove('hidden');
}

function renderParticipants(participants, group, isGroupCompleted) {
    const sorted = group.isOrderSet 
        ? participants.slice().sort(function(a, b) { return (a.order != null ? a.order : 999) - (b.order != null ? b.order : 999); })
        : participants;
    
    const currentRecipientIndex = group.currentRecipientIndex != null ? group.currentRecipientIndex : 0;
    
    const list = document.getElementById('participants-list');
    list.innerHTML = sorted.map(function(p, index) {
        const isFirst = index === currentRecipientIndex && group.isOrderSet;
        const isPaid = p.isPaid === true;
        const hasReceivedPayment = p.hasReceivedPayment === true;
        const paidClass = hasReceivedPayment ? 'participant-card-paid' : '';
        
        // Serial number: green only for participants who received payout (like app)
        const serialNum = (p.order !== null && p.order !== undefined) ? p.order : (index + 1);
        const orderPaidClass = hasReceivedPayment ? 'order-number-paid' : '';
        const orderNumberHtml = '<div class="order-number ' + orderPaidClass + '"><div class="order-number-text">' + serialNum + '</div></div>';
        
        // PAID OUT badge only for participants who have received payment
        let rightHtml = '';
        if (hasReceivedPayment) {
            rightHtml = '<div class="paid-out-tag-right"><div class="paid-out-text-inline">PAID OUT</div></div>';
        } else if (group.isOrderSet) {
            if (isPaid) {
                rightHtml = '<div class="payment-status-container"><div class="paid-status">PAID</div></div>';
            } else {
                rightHtml = '<div class="payment-status-container"><div class="payment-status">UNPAID</div></div>';
            }
        }
        
        return \`
            <div class="participant-card \${paidClass}">
                <div class="participant-top-row">
                    <div class="participant-left">
                        \${orderNumberHtml}
                        <div class="participant-name">\${escapeHtml(formatParticipantName(p.name))}</div>
                    </div>
                    \${rightHtml}
                </div>
            </div>
        \`;
    }).join('');
}

function renderLogs(logs) {
    const container = document.getElementById('logs-container');
    if (logs.length === 0) {
        container.innerHTML = '<div class="logs-empty-state"><div class="logs-empty-text">No activity yet</div></div>';
        return;
    }
    
    container.innerHTML = '<div class="logs-list">' + logs.slice(0, 10).map(log => {
        const timestamp = log.createdAt || log.paidAt;
        const dateLabel = timestamp ? new Date(timestamp).toLocaleString() : '';
        const isActivity = log.type === 'group_created' || log.type === 'spin';
        const participantName = log.paidBy?.name || log.paidTo?.name || 'Unknown';
        const roundText = typeof log.roundNumber === 'number' ? \` • Round \${log.roundNumber}\` : '';
        const mainText = isActivity ? (log.description || '') : (log.description || (participantName + ' paid' + roundText));
        const amountText = !isActivity && typeof log.amount === 'number' && log.amount > 0 ? \`<div class="log-sub-text">Amount: $\${log.amount}</div>\` : '';
        
        return \`
            <div class="log-item">
                <div class="log-left">
                    <div class="log-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                    </div>
                    <div class="log-text-container">
                        <div class="log-main-text">\${escapeHtml(mainText)}</div>
                        \${amountText}
                    </div>
                </div>
                <div class="log-time-text">\${dateLabel}</div>
            </div>
        \`;
    }).join('') + '</div>';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('group-content').classList.add('hidden');
}

function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('group-content').classList.add('hidden');
}


// SSE (Server-Sent Events) - real-time updates, no polling
var sseSource = null;
var sseReconnectDelay = 2000;
var sseReconnectTimer = null;

function startRealtime() {
    if (!shareCode) return;
    stopRealtime();
    var streamUrl = API_BASE_URL + '/groups/view/' + encodeURIComponent(shareCode) + '/stream';
    try {
        sseSource = new EventSource(streamUrl);
        sseSource.addEventListener('group_update', function(e) {
            try {
                var parsed = JSON.parse(e.data);
                if (parsed && parsed.group) renderGroup(parsed.group);
            } catch (err) {
                console.error('SSE: Failed to parse group_update:', err);
            }
        });
        sseSource.onerror = function() {
            sseSource.close();
            sseSource = null;
            if (document.visibilityState === 'visible') {
                sseReconnectTimer = setTimeout(function() {
                    startRealtime();
                }, sseReconnectDelay);
            }
        };
    } catch (err) {
        console.error('SSE: Failed to connect:', err);
        if (document.visibilityState === 'visible') {
            sseReconnectTimer = setTimeout(function() {
                startRealtime();
            }, sseReconnectDelay);
        }
    }
}

function stopRealtime() {
    if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
        sseReconnectTimer = null;
    }
    if (sseSource) {
        sseSource.close();
        sseSource = null;
    }
}

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && shareCode) {
        loadGroup();
        startRealtime();
    } else {
        stopRealtime();
    }
});
window.addEventListener('pageshow', function(e) {
    if (e.persisted && shareCode) loadGroup();
    if (document.visibilityState === 'visible' && shareCode) startRealtime();
});

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'open-in-app-btn') {
        tryDeepLink();
    }
});

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (shareCode) {
            loadGroup();
        } else {
            showError('Invalid share link. Missing share code.');
        }
    });
} else {
    if (shareCode) {
        loadGroup();
    } else {
        showError('Invalid share link. Missing share code.');
    }
}
    </script>
</body>
</html>`;

    // Disable all caching for HTML page - shared link must always show fresh data
    res.set({
      'Content-Type': 'text/html',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });
    res.send(html);
  } catch (err) {
    res.status(500).send('Error loading page');
  }
};
