# Monthly Collection Notifications

## Overview

When a user creates a group with **MONTHLY** frequency and sets a collection date, the system automatically sends push notifications to all participants every month on that date until the group activity is completed.

## How It Works

### 1. Group Setup
- User creates a group and selects **MONTHLY** frequency
- User sets a collection date (1-31)
- System saves the group with these settings

### 2. Scheduled Task
- A scheduled task runs **daily at 9:00 AM**
- Checks all ACTIVE groups with `frequency: 'MONTHLY'`
- Matches groups where `collectionDate` equals today's date
- Sends notifications to all registered participants

### 3. Notification Details
- **Title**: `💰 Collection Reminder: [Group Name]`
- **Body**: `It's collection day! Please contribute $[Amount] for [Group Name].`
- **Type**: `collection_reminder`
- **Data**: Includes groupId, groupName, amountPerPerson, collectionDate, frequency

### 4. Duplicate Prevention
- System tracks `lastCollectionNotificationSent` date
- Only sends one notification per month per group
- Skips if notification was already sent this month

### 5. Automatic Stop
- Notifications stop when group status changes to:
  - `COMPLETED` - All rounds finished
  - `CANCELLED` - Group cancelled

## Requirements

### For Notifications to Be Sent:
1. ✅ Group must have `status: 'ACTIVE'`
2. ✅ Group must have `frequency: 'MONTHLY'`
3. ✅ Group must have `collectionDate` set (1-31)
4. ✅ Group must have `amountPerPerson` set and > 0
5. ✅ Today's date must match `collectionDate`
6. ✅ Participants must be registered users (have `userId`)
7. ✅ Participants must have push tokens registered

## Technical Implementation

### Files Modified:
1. **`app/models/Group.js`**
   - Added `lastCollectionNotificationSent` field to track when notification was last sent

2. **`app/services/schedulerService.js`** (New)
   - Scheduled task using `node-cron`
   - Runs daily at 9:00 AM
   - Checks and sends collection notifications

3. **`server.js`**
   - Initializes scheduler after MongoDB connection

4. **`app/controllers/groupController.js`**
   - Added test endpoint for manual notification check

### Dependencies:
- `node-cron` - For scheduling tasks

## Testing

### Manual Test Endpoint:
```bash
POST /api/groups/test-collection-notifications
Headers: Authorization: Bearer <token>
```

This manually triggers the notification check without waiting for the scheduled time.

### Example Test:
1. Create a group with MONTHLY frequency
2. Set collection date to today's date
3. Add participants (with userId)
4. Call test endpoint or wait for 9:00 AM
5. Check app for push notifications

## Logs

The scheduler logs detailed information:
```
[SCHEDULER] Checking for groups that need collection notifications...
[SCHEDULER] Found X group(s) with collection date today (15)
[SCHEDULER] Sending collection notification for group: [Group Name]
[SCHEDULER] Notifying X user(s)
[SCHEDULER] ✅ Successfully sent collection notifications for group: [Group Name]
```

## Configuration

### Schedule Time
Default: **9:00 AM daily**

To change, edit `app/services/schedulerService.js`:
```javascript
// Current: '0 9 * * *' (9:00 AM daily)
// Format: minute hour day month dayOfWeek
cron.schedule('0 9 * * *', async () => {
  // ...
});
```

### Example Schedule Times:
- `'0 9 * * *'` - 9:00 AM daily (default)
- `'0 8 * * *'` - 8:00 AM daily
- `'0 9 * * 1'` - 9:00 AM every Monday
- `'0 9 1 * *'` - 9:00 AM on 1st of every month

## Troubleshooting

### Notifications Not Sending?

1. **Check group status**
   - Must be `ACTIVE`
   - Not `COMPLETED` or `CANCELLED`

2. **Check frequency**
   - Must be `MONTHLY` (not `WEEKLY`)

3. **Check collection date**
   - Must match today's date (1-31)
   - Example: If collection date is 15, notifications only send on 15th of each month

4. **Check participants**
   - Must have registered users (with `userId`)
   - Must have push tokens registered

5. **Check scheduler**
   - Backend server must be running
   - Scheduler initializes on server start
   - Check logs for `[SCHEDULER]` messages

6. **Check last notification sent**
   - If `lastCollectionNotificationSent` is this month, notification won't send
   - This prevents duplicate notifications

### Manual Test:
Use the test endpoint to manually trigger notifications:
```bash
curl -X POST http://localhost:5001/api/groups/test-collection-notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Future Enhancements

- [ ] Add WEEKLY frequency support
- [ ] Allow custom notification times per group
- [ ] Add email notifications in addition to push
- [ ] Add notification preferences per user
- [ ] Add reminder notifications (e.g., 1 day before)
