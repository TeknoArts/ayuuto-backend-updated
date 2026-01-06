# Firebase Service Account Key Setup

## Your Firebase Service Account Email
**Service Account Email:** `firebase-adminsdk-fbsvc@ayuuto-3904b.iam.gserviceaccount.com`

This is your service account email. You still need to download the JSON key file.

## Quick Setup

1. **Download your Firebase service account key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project: **ayuuto-3904b**
   - Click the gear icon ⚙️ → **Project settings**
   - Go to the **Service accounts** tab
   - You should see your service account: `firebase-adminsdk-fbsvc@ayuuto-3904b.iam.gserviceaccount.com`
   - Click **"Generate new private key"** button
   - A JSON file will download (usually named something like `ayuuto-3904b-firebase-adminsdk-xxxxx.json`)

2. **Place the file:**
   - Rename the downloaded file to: `firebase-service-account.json`
   - Place it in: `ayuuto-backend/config/`
   - Full path: `ayuuto-backend/config/firebase-service-account.json`

3. **Verify the file structure:**
   The file should contain:
   ```json
   {
     "type": "service_account",
     "project_id": "your-project-id",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "...",
     ...
   }
   ```

4. **Test:**
   - Start your backend server
   - You should see: `Firebase Admin SDK initialized successfully`
   - If you see a warning, check the file path and JSON validity

## Security

⚠️ **NEVER commit this file to git!** It's already in `.gitignore`.

## Code Pattern Used

The Firebase service uses this initialization pattern:

```javascript
var admin = require("firebase-admin");
var serviceAccount = require("path/to/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

In our implementation, the path is automatically resolved to:
`config/firebase-service-account.json`

