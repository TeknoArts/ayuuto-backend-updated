# Config Directory

## Firebase Service Account Key

Place your Firebase service account key JSON file here with the name:
`firebase-service-account.json`

### Your Firebase Project Info:
- **Project ID:** `ayuuto-3904b`
- **Service Account Email:** `firebase-adminsdk-fbsvc@ayuuto-3904b.iam.gserviceaccount.com`

### How to get your Firebase service account key:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **ayuuto-3904b**
3. Click the gear icon ⚙️ → **Project settings**
4. Go to the **Service accounts** tab
5. You should see: `firebase-adminsdk-fbsvc@ayuuto-3904b.iam.gserviceaccount.com`
6. Click **"Generate new private key"** button
7. A JSON file will download (usually named like `ayuuto-3904b-firebase-adminsdk-xxxxx.json`)
8. **Rename it to:** `firebase-service-account.json`
9. **Place it in this `config/` directory**

### Example File Structure:

See `firebase-service-account.example.json` for the expected structure.
Your actual file should have real values (not placeholders).

### Security Note:

⚠️ **IMPORTANT**: Never commit this file to git! It's already added to `.gitignore`.

The file should look like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  ...
}
```

