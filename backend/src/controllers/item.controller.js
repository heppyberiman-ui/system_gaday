const itemService = require('../services/item.service');

/**
 * Handle list items request
 */
const getAll = async (req, res, next) => {
  try {
    const result = await itemService.getAllItems(req.query, req.user);
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle fetch item details request
 */
const getById = async (req, res, next) => {
  try {
    const item = await itemService.getItemById(req.params.id, req.user);
    res.status(200).json({
      status: 'success',
      data: { item }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle add new item request
 */
const create = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.photoPath = 'uploads/barang/' + req.file.filename;
    }
    const newItem = await itemService.createItem(req.body, req.user);
    res.status(201).json({
      status: 'success',
      message: 'Item registered successfully',
      data: { item: newItem }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle update item request
 */
const update = async (req, res, next) => {
  try {
    if (req.file) {
      req.body.photoPath = 'uploads/barang/' + req.file.filename;
    }
    const updatedItem = await itemService.updateItem(req.params.id, req.body, req.user);
    res.status(200).json({
      status: 'success',
      message: 'Item updated successfully',
      data: { item: updatedItem }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle delete item request
 */
const remove = async (req, res, next) => {
  try {
    const result = await itemService.deleteItem(req.params.id, req.user);
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
