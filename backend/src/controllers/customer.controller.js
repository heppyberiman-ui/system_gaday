const customerService = require('../services/customer.service');

/**
 * Handle list customers request
 */
const getAll = async (req, res, next) => {
  try {
    const result = await customerService.getAllCustomers(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle fetch customer details by ID (UUID string)
 */
const getById = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      data: { customer }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle add new customer request
 */
const create = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.ktpPhotoPath = req.file.filename;
    }
    // Set customer's store ID to the current logged-in user's store ID if not provided
    if (!req.body.storeId && req.user && req.user.storeId) {
      req.body.storeId = req.user.storeId;
    }
    const newCustomer = await customerService.createCustomer(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Customer registered successfully',
      data: { customer: newCustomer }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle update customer request
 */
const update = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.ktpPhotoPath = req.file.filename;
    }
    const updatedCustomer = await customerService.updateCustomer(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Customer updated successfully',
      data: { customer: updatedCustomer }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle delete customer request
 */
const remove = async (req, res, next) => {
  try {
    const result = await customerService.deleteCustomer(req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
