const cashflowService = require('../services/cashflow.service');

/**
 * Handle fetch cash flows request
 */
const getAll = async (req, res, next) => {
  try {
    const data = await cashflowService.getAllCashFlows(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle operational expense recording request
 */
const createExpense = async (req, res, next) => {
  try {
    const result = await cashflowService.createExpense(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Operational expense and cash flow record created successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle fetch cash flow summary request
 */
const getSummary = async (req, res, next) => {
  try {
    const data = await cashflowService.getCashFlowSummary(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  createExpense,
  getSummary
};
