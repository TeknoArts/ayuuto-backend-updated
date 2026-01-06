/**
 * Test script to send a push notification
 * 
 * Usage:
 * 1. Make sure backend is running
 * 2. Login to get your auth token (or use an existing one)
 * 3. Run: node test-notification.js
 */

const http = require('http');

// Configuration
const BACKEND_URL = 'http://localhost:5001/api';
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace with your actual token

// Test notification data
const notificationData = {
  title: 'Test Notification',
  body: 'This is a test notification from the backend!',
  data: {
    type: 'test',
    timestamp: new Date().toISOString(),
  },
};

function sendTestNotification() {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BACKEND_URL}/users/test-notification`);
    const postData = JSON.stringify(notificationData);

    const options = {
      hostname: url.hostname,
      port: url.port || 5001,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    console.log('Sending test notification...');
    console.log('Backend URL:', `${BACKEND_URL}/users/test-notification`);
    console.log('Notification:', notificationData);
    console.log('');

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log('✅ Success!');
            console.log('Response:', response);
            console.log('\nCheck your device - you should see the notification!');
            resolve(response);
          } else {
            console.error('❌ Error:');
            console.error('Status:', res.statusCode);
            console.error('Response:', response);
            reject(new Error(`HTTP ${res.statusCode}: ${response.message || data}`));
          }
        } catch (error) {
          console.error('❌ Error parsing response:');
          console.error('Status:', res.statusCode);
          console.error('Response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('\n❌ Error sending notification:');
      console.error('Error:', error.message);
      console.log('\nTroubleshooting:');
      console.log('1. Make sure backend is running: cd ayuuto-backend && npm start');
      console.log('2. Get your auth token by logging in to the app');
      console.log('3. Update AUTH_TOKEN in this file');
      console.log('4. Make sure you are logged in and have a push token registered');
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

// Run the test
if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
  console.log('⚠️  Please update AUTH_TOKEN in this file first!');
  console.log('');
  console.log('To get your token:');
  console.log('1. Login to your app');
  console.log('2. Or use: curl -X POST http://localhost:5001/api/auth/login -H "Content-Type: application/json" -d \'{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}\'');
  console.log('3. Copy the token from the response');
  console.log('4. Update AUTH_TOKEN in this file');
  process.exit(1);
}

sendTestNotification()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });

