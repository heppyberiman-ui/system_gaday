const transactionService = require('../services/transaction.service');

/**
 * Handle list transactions request
 */
const getAll = async (req, res, next) => {
  try {
    const result = await transactionService.getAllTransactions(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle fetch transaction details request
 */
const getById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      data: { transaction }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle create new pawn transaction (Disburse loan)
 */
const create = async (req, res, next) => {
  try {
    const newTx = await transactionService.createTransaction(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Pawn transaction completed and cash flow logged successfully.',
      data: { transaction: newTx }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle redeem transaction request (penebusan)
 */
const redeem = async (req, res, next) => {
  try {
    const result = await transactionService.redeemTransaction(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Pawn redemption completed successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle extend transaction request (perpanjangan)
 */
const extend = async (req, res, next) => {
  try {
    const result = await transactionService.extendTransaction(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Pawn extension completed successfully.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle auction sale request for overdue transaction (lelang barang sitaan)
 */
const auction = async (req, res, next) => {
  try {
    const result = await transactionService.auctionTransaction(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Barang jaminan berhasil dieksekusi lelang dan uang hasil penjualan telah dicatat ke Arus Kas.',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  redeem,
  extend,
  auction
};
