const Category = require('../../models/category&subcategory/categoryModel');
const globaLhandler = require('../globaLhandler');

/**
 * @desc get all categories.
 * @route  /api/v1/categories
 * @access public.
 */
exports.getAllCategories = globaLhandler.getAll(Category);

/**
 * @desc get category.
 * @route  /api/v1/categories.
 * @access public.
 */
exports.getCategory = globaLhandler.getOne(Category, null);

/** 
  @desc Create category.
  @route POST /api/v1/categories.
  @access private.
*/
exports.createCategory = globaLhandler.createOne(Category);

/** 
  @desc delete category by id.
  @route DELETE /api/v1/categories/:id.
  @access private only admins.
*/
exports.deleteCategory = globaLhandler.deleteOne(Category);

/** 
  @desc update category by id.
  @route PATCH /api/v1/categories/:id.
  @access private only admins.
*/
exports.updateCategory = globaLhandler.updateOne(Category);
