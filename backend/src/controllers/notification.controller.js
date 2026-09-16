const notificationService = require('../services/notification.service');

/**
 * Handle fetch WhatsApp due reminders
 */
const getReminders = async (req, res, next) => {
  try {
    const result = await notificationService.getDueReminders(req.user);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReminders
};
