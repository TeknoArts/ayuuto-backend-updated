# Debug: Why Notifications Not Sending to Group Members

## How Notifications Work

### 1. When Notifications Are Sent

Notifications are sent to all group members when:
- ✅ **Payment marked as complete** (`updatePaymentStatus`)
- ✅ **Next round starts** (`nextRound`)
- ✅ **Group completed** (`nextRound` when all paid out)

### 2. Who Gets Notifications

The `sendNotificationToGroup` function sends to:
- ✅ Group creator (`group.createdBy`)
- ✅ All participants who have `participant.user` (registered users)
- ❌ **Excludes** the user who triggered the action (e.g., the payer)

### 3. Requirements for Notifications

For a user to receive notifications, they must:
1. ✅ Be a registered user (have an account)
2. ✅ Be linked to the participant (`participant.user` must be set)
3. ✅ Have push tokens registered (`user.pushTokens` array not empty)
4. ✅ Not be excluded (e.g., not the person who marked payment)

---

## Common Issues

### Issue 1: Participants Not Linked to Users

**Problem:** Participants added by email only (not registered users) won't receive notifications.

**Check:**
```javascript
// In Railway logs, check if participants have userId:
console.log('Participant:', {
  name: participant.name,
  email: participant.email,
  userId: participant.user // Should be ObjectId, not null
});
```

**Fix:** 
- Participants must be registered users to receive notifications
- Email-only participants won't get notifications until they create an account

### Issue 2: Push Tokens Not Registered

**Problem:** Users haven't registered their push tokens.

**Check Railway logs:**
Look for: `Push token registered: ExponentPushToken[...]`

**Fix:**
- Users must log in to the app
- App automatically registers push token on login
- Check if users have logged in at least once

### Issue 3: Group Not Populated Before Sending

**Problem:** `group.participants.user` is not populated before calling `sendNotificationToGroup`.

**Check code:**
```javascript
// Should see this before sendNotificationToGroup:
await group.populate('participants.user', 'name email');
await group.populate('createdBy', 'name email');
```

**Fix:** Already implemented ✅ - code populates before sending

### Issue 4: Users Excluded Incorrectly

**Problem:** The `excludeUserId` parameter might be excluding too many users.

**Check:** In `updatePaymentStatus`, the payer is excluded:
```javascript
excludeUserId: participant.user ? ... : null
```

This is correct - the payer shouldn't get notified about their own payment.

---

## Debugging Steps

### Step 1: Check Railway Logs

Look for these log messages when payment is marked or next round starts:

```
[NOTIFICATION] Sending "Payment Received" to X group member(s) in "Group Name"
[NOTIFICATION] ✅ Sent Y/X notification(s) successfully
```

**If you see:**
- `Sending to 0 group member(s)` → No users found (Issue 1 or 2)
- `Sent 0/X successfully` → Push tokens not registered (Issue 2)
- `Error sending to user` → Check Firebase configuration

### Step 2: Check Participant Linking

Query the database to see if participants are linked:

```javascript
// In Railway logs or MongoDB shell:
const group = await Group.findById(groupId).populate('participants.user');
group.participants.forEach(p => {
  console.log({
    name: p.name,
    email: p.email,
    hasUser: !!p.user,
    userId: p.user?._id
  });
});
```

### Step 3: Check Push Tokens

Check if users have push tokens registered:

```javascript
// In Railway logs or MongoDB shell:
const user = await User.findById(userId).select('pushTokens');
console.log({
  userId: user._id,
  tokenCount: user.pushTokens?.length || 0,
  tokens: user.pushTokens
});
```

### Step 4: Test Notification Manually

Use the test script to send a notification:

```bash
node test-user-notification.js <userId>
```

---

## Quick Fixes

### Fix 1: Ensure Participants Are Registered Users

- Only registered users can receive notifications
- Email-only participants need to create accounts
- After creating account, they'll be auto-linked (already implemented ✅)

### Fix 2: Ensure Users Have Logged In

- Users must log in at least once to register push tokens
- Check Railway logs for: `Push token registered`
- If missing, have users log out and log back in

### Fix 3: Check Firebase Configuration

- Verify `FIREBASE_SERVICE_ACCOUNT_KEY` is set in Railway
- Check Firebase project is configured correctly
- Verify Expo project ID matches

---

## Expected Behavior

When payment is marked:
1. ✅ Notification sent to all group members EXCEPT the payer
2. ✅ Notification stored in database for each user
3. ✅ Push notification sent to each user's registered devices
4. ✅ Log shows: `Sent X/Y notification(s) successfully`

---

## What to Check

1. **Railway Logs** - Look for notification logs
2. **Participant Linking** - Check if `participant.user` is set
3. **Push Tokens** - Check if users have tokens registered
4. **Firebase Config** - Verify service account key is set

---

## Summary

Notifications are sent to:
- ✅ Registered users only (not email-only participants)
- ✅ Users with push tokens registered
- ✅ All group members except the action triggerer

If notifications aren't working:
1. Check Railway logs for error messages
2. Verify participants are linked to user accounts
3. Verify users have push tokens registered
4. Check Firebase configuration
