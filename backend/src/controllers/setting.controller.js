const settingService = require('../services/setting.service');

/**
 * Handle fetch store settings configuration
 */
const getSettings = async (req, res, next) => {
  try {
    const data = await settingService.getSettings(req.user);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle modify store settings configuration
 */
const updateSettings = async (req, res, next) => {
  try {
    const payload = { ...req.body };
    if (req.file) {
      payload.storePhotoPath = `/uploads/${req.file.filename}`;
    }
    const data = await settingService.updateSettings(payload, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Store settings updated successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle clear all application data
 */
const clearData = async (req, res, next) => {
  try {
    const result = await settingService.clearAllData();
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle export full JSON database backup
 */
const exportBackup = async (req, res, next) => {
  try {
    const backupData = await settingService.exportBackup();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `gaday_db_backup_${dateStr}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.status(200).send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    next(error);
  }
};

/**
 * Handle import full JSON database restore
 */
const importRestore = async (req, res, next) => {
  try {
    const result = await settingService.importRestore(req.body);
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  clearData,
  exportBackup,
  importRestore
};
