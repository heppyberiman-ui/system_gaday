const reportService = require('../services/report.service');

/**
 * Handle fetch dashboard metrics request
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const data = await reportService.getDashboardStats(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle fetch detailed revenue report request
 */
const getRevenueReport = async (req, res, next) => {
  try {
    const data = await reportService.getRevenueReport(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getRevenueReport
};
