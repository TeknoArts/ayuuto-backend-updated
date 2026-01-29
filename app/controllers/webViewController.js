const path = require('path');
const fs = require('fs');

// @desc    Serve web view HTML page
// @route   GET /view/:shareCode
// @access  Public
exports.serveGroupView = (req, res) => {
  try {
    // Decode shareCode in case it was URL encoded
    let { shareCode } = req.params;
    shareCode = decodeURIComponent(shareCode);
    
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
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 24px;
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

.admin-badge {
    background-color: #002452;
    padding: 6px 12px;
    border-radius: 12px;
}

.admin-text {
    color: #FFFFFF;
    font-size: 12px;
    font-weight: bold;
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
    color: #bc9426;
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
    border-color: #4CAF50;
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
    width: 24px;
    height: 24px;
    border-radius: 6px;
    background-color: #9BA1A6;
    display: flex;
    align-items: center;
    justify-content: center;
}

.order-number-paid {
    background-color: #4CAF50;
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
    background-color: #4CAF50;
    border-radius: 6px;
    padding: 4px 8px;
    margin-left: 8px;
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
    color: #bc9426;
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

.completion-title {
    font-size: 32px;
    font-weight: bold;
    color: #4CAF50;
    letter-spacing: 2px;
    margin-top: 16px;
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
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            <div class="completion-title">AYUUTO COMPLETED</div>
            <div class="completion-message">All members have been paid out</div>
        </div>
    </div>

    <script>
const API_BASE_URL = '${apiBaseUrl}';
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
        
        // Use shareCode instead of token - no token in URL
        // URL encode the shareCode to handle special characters
        const encodedShareCode = encodeURIComponent(shareCode);
        // Strong cache buster so shared link always gets fresh data
        const timestamp = new Date().getTime();
        const r = Math.random().toString(36).slice(2);
        const apiUrl = \`\${API_BASE_URL}/groups/view/\${encodedShareCode}?_t=\${timestamp}&_r=\${r}\`;
        
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
        
        // Store groupId for deep linking
        if (data.data.group && data.data.group.id) {
            groupId = data.data.group.id;
            // Try to deep link to app (will show web view if app not installed)
            tryDeepLink();
        }
        
        // Render the group view (will show if app doesn't open)
        renderGroup(data.data.group);
        hideLoading();
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
    // Group name
    document.getElementById('group-name').textContent = group.name.toUpperCase();
    
    // Calculate total savings
    const totalSavings = group.amountPerPerson && group.memberCount 
        ? group.amountPerPerson * group.memberCount 
        : 0;
    document.getElementById('amount-text').textContent = totalSavings.toString();
    
    // Badge (admin or completed) - use isCompleted from API so shared link shows fresh state
    const badgeContainer = document.getElementById('badge-container');
    const allPaidOut = group.isCompleted === true || group.status === 'COMPLETED' ||
        (group.participants && group.participants.every(p => p.hasReceivedPayment === true));
    if (allPaidOut) {
        badgeContainer.innerHTML = '<div class="completed-badge"><div class="completed-text">COMPLETED</div></div>';
    } else {
        badgeContainer.innerHTML = '<div class="admin-badge"><div class="admin-text">ADMIN</div></div>';
    }
    
    // Next recipient
    const nextRecipientEl = document.getElementById('next-recipient-value');
    if (allPaidOut) {
        const progressBars = group.participants ? group.participants.map(() => '<div class="progress-bar-segment"></div>').join('') : '';
        nextRecipientEl.innerHTML = '<div class="progress-indicator">' + progressBars + '</div>';
    } else if (group.rounds && group.rounds.length > 0 && group.rounds[0].recipient) {
        const recipientName = formatParticipantName(group.rounds[0].recipient.name);
        nextRecipientEl.innerHTML = '<div class="next-recipient-name">' + escapeHtml(recipientName.toUpperCase()) + '</div>';
    } else {
        nextRecipientEl.innerHTML = '<div class="question-marks">???</div>';
    }
    
    // Collection day
    const collectionDay = group.collectionDate || 2;
    document.getElementById('collection-day').textContent = 'COLLECTION DAY ' + collectionDay;
    
    // Participants
    if (group.participants && group.participants.length > 0) {
        renderParticipants(group.participants, group);
    }
    
    // Activity logs
    if (group.activityLog && group.activityLog.length > 0) {
        renderLogs(group.activityLog);
    } else {
        document.getElementById('logs-container').innerHTML = '<div class="logs-empty-state"><div class="logs-empty-text">No activity yet</div></div>';
    }
    
    // Completion card
    if (allPaidOut) {
        document.getElementById('completion-card').classList.remove('hidden');
    }
    
    document.getElementById('group-content').classList.remove('hidden');
}

function renderParticipants(participants, group) {
    const sorted = group.isOrderSet 
        ? [...participants].sort((a, b) => (a.order || 0) - (b.order || 0))
        : participants;
    
    const currentRecipientIndex = group.currentRecipientIndex || 0;
    const allPaidOut = group.isCompleted === true || group.status === 'COMPLETED' ||
        participants.every(p => p.hasReceivedPayment === true);
    
    const list = document.getElementById('participants-list');
    list.innerHTML = sorted.map((p, index) => {
        const isFirst = index === currentRecipientIndex && group.isOrderSet;
        const isPaid = p.isPaid === true;
        const hasReceivedPayment = p.hasReceivedPayment === true;
        const paidClass = (isFirst || isPaid || allPaidOut) ? 'participant-card-paid' : '';
        
        let orderNumberHtml = '';
        if (group.isOrderSet && p.order !== null && p.order !== undefined) {
            const orderPaidClass = (isFirst || isPaid || allPaidOut) ? 'order-number-paid' : '';
            orderNumberHtml = \`<div class="order-number \${orderPaidClass}"><div class="order-number-text">\${p.order + 1}</div></div>\`;
        }
        
        let paidOutTag = '';
        if (hasReceivedPayment) {
            paidOutTag = '<div class="paid-out-tag-inline"><div class="paid-out-text-inline">PAID OUT</div></div>';
        }
        
        let statusHtml = '';
        if (group.isOrderSet && !isFirst) {
            if (isPaid) {
                statusHtml = '<div class="payment-status-container"><div class="paid-status">PAID</div></div>';
            } else {
                statusHtml = '<div class="payment-status-container"><div class="payment-status">UNPAID</div></div>';
            }
        }
        
        return \`
            <div class="participant-card \${paidClass}">
                <div class="participant-top-row">
                    <div class="participant-left">
                        \${orderNumberHtml}
                        <div class="participant-name">\${escapeHtml(formatParticipantName(p.name))}</div>
                        \${paidOutTag}
                    </div>
                    \${statusHtml}
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
    
    container.innerHTML = '<div class="logs-list">' + logs.slice(0, 3).map(log => {
        const timestamp = log.createdAt || log.paidAt;
        const dateLabel = timestamp ? new Date(timestamp).toLocaleString() : '';
        const participantName = log.paidBy?.name || log.paidTo?.name || 'Unknown';
        const roundText = typeof log.roundNumber === 'number' ? \` • Round \${log.roundNumber}\` : '';
        const amountText = typeof log.amount === 'number' && log.amount > 0 ? \`<div class="log-sub-text">Amount: $\${log.amount}</div>\` : '';
        
        return \`
            <div class="log-item">
                <div class="log-left">
                    <div class="log-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                    </div>
                    <div class="log-text-container">
                        <div class="log-main-text">\${escapeHtml(participantName)} paid\${roundText}</div>
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


// Refetch when user returns to the tab so shared link always shows fresh data
let wasHidden = false;
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && wasHidden && shareCode) {
        loadGroup();
    }
    if (document.visibilityState === 'hidden') wasHidden = true;
});
// Refetch when page is restored from back-forward cache (e.g. user pressed back)
window.addEventListener('pageshow', (e) => {
    if (e.persisted && shareCode) loadGroup();
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
