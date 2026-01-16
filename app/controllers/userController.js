const User = require('../models/User');
const notificationService = require('../services/notificationService');

// @desc    Register push notification token
// @route   POST /api/users/push-token
// @access  Private
exports.registerPushToken = async (req, res, next) => {
  try {
    console.log('\n📥 Push token registration request received');
    console.log(`   User ID: ${req.user.id}`);
    console.log(`   Body:`, JSON.stringify(req.body, null, 2));
    
    const { pushToken, platform, deviceId } = req.body;
    const userId = req.user.id;

    if (!pushToken || !platform) {
      console.log('❌ Missing pushToken or platform');
      return res.status(400).json({
        success: false,
        message: 'Push token and platform are required',
      });
    }

    // Validate platform
    if (!['ios', 'android', 'web'].includes(platform)) {
      console.log(`❌ Invalid platform: ${platform}`);
      return res.status(400).json({
        success: false,
        message: 'Platform must be ios, android, or web',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log(`❌ User ${userId} not found in database`);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    console.log(`✅ User found: ${user.name} (${user.email})`);

    // Remove existing token for this device/platform if exists
    // This prevents duplicate tokens for the same device
    user.pushTokens = user.pushTokens.filter(
      (t) => !(t.token === pushToken || (deviceId && t.deviceId === deviceId && t.platform === platform))
    );

    // Add new token
    user.pushTokens.push({
      token: pushToken,
      platform,
      deviceId: deviceId || null,
    });

    await user.save();

    console.log(`\n✅ Push token registered successfully!`);
    console.log(`   User: ${user.name} (${user.email})`);
    console.log(`   Token: ${pushToken.substring(0, 30)}...`);
    console.log(`   Platform: ${platform}`);
    console.log(`   Total tokens: ${user.pushTokens.length}\n`);

    res.status(200).json({
      success: true,
      message: 'Push token registered successfully',
      data: {
        tokenCount: user.pushTokens.length,
      },
    });
  } catch (err) {
    console.error('❌ Error registering push token:', err);
    next(err);
  }
};

// @desc    Remove push notification token
// @route   DELETE /api/users/push-token
// @access  Private
exports.removePushToken = async (req, res, next) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove the token
    const initialCount = user.pushTokens.length;
    user.pushTokens = user.pushTokens.filter((t) => t.token !== pushToken);

    if (user.pushTokens.length === initialCount) {
      return res.status(404).json({
        success: false,
        message: 'Push token not found',
      });
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Push token removed successfully',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Send test push notification (for development/testing)
// @route   POST /api/users/test-notification
// @access  Private
exports.sendTestNotification = async (req, res, next) => {
  try {
    const { title, body, data } = req.body;
    const userId = req.user.id;

    console.log(`\n🔔 Test notification requested by user ${userId}`);
    console.log(`   Title: ${title || 'Test Notification'}`);
    console.log(`   Body: ${body || 'This is a test notification from the backend'}`);

    const { notification, results } = await notificationService.sendNotificationToUser({
      userId,
      title: title || 'Test Notification',
      body: body || 'This is a test notification from the backend',
      type: (data && data.type) || 'test',
      data: data || {},
    });

    const successCount = results ? results.filter((r) => r.success).length : 0;
    const totalCount = results ? results.length : 0;

    res.status(200).json({
      success: successCount > 0,
      message:
        successCount > 0
          ? `Test notification sent successfully to ${successCount}/${totalCount} device(s)`
          : 'Failed to send notification to any device. Check logs for details.',
      data: {
        notificationId: notification._id,
        results,
      },
    });
  } catch (err) {
    console.error('❌ Error sending test notification:', err);
    next(err);
  }
};

// @desc    Get user's push token info (for debugging)
// @route   GET /api/users/push-token-info
// @access  Private
exports.getPushTokenInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const User = require('../models/User');
    
    const user = await User.findById(userId).select('name email pushTokens');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        tokenCount: user.pushTokens ? user.pushTokens.length : 0,
        tokens: user.pushTokens ? user.pushTokens.map(t => ({
          token: t.token.substring(0, 30) + '...',
          platform: t.platform,
          deviceId: t.deviceId,
          createdAt: t.createdAt,
          isExpoToken: t.token.startsWith('ExponentPushToken['),
        })) : [],
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get list of users (for participant selection)
// @route   GET /api/users
// @access  Private
exports.getUsers = async (req, res, next) => {
  try {
    const qRaw = req.query.q;
    const q = typeof qRaw === 'string' ? qRaw.trim() : '';

    const filter = q
      ? {
          $or: [
            { name: { $regex: new RegExp(q, 'i') } },
            { email: { $regex: new RegExp(q, 'i') } },
          ],
        }
      : {};

    const users = await User.find(filter)
      .select('name email')
      .sort({ name: 1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        users: users.map((u) => ({
          id: u._id,
          name: u.name,
          email: u.email,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get user statistics (total count, etc.)
// @route   GET /api/users/stats
// @access  Private
exports.getUserStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const usersWithEmail = await User.countDocuments({ email: { $exists: true, $ne: '' } });
    const usersWithName = await User.countDocuments({ name: { $exists: true, $ne: '' } });
    
    // Count by creation date
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const usersThisMonth = await User.countDocuments({ createdAt: { $gte: thisMonth } });
    const usersLastMonth = await User.countDocuments({ 
      createdAt: { $gte: lastMonth, $lt: thisMonth } 
    });
    
    // Get recent users (last 5)
    const recentUsers = await User.find()
      .select('name email createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        usersWithEmail,
        usersWithName,
        growth: {
          thisMonth: usersThisMonth,
          lastMonth: usersLastMonth,
        },
        recentUsers: recentUsers.map(u => ({
          name: u.name || 'No name',
          email: u.email || 'No email',
          createdAt: u.createdAt,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
};
