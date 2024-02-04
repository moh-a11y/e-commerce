const Copoun = require('../../models/copouns&tags/copounModel');
const globaLhandler = require('../globaLhandler');

/**
 * @desc get all copouns.
 * @route GET  /api/v1/copouns
 * @access private admins only.
 */
exports.getAllCopouns = globaLhandler.getAll(Copoun);

/**
 * @desc get one copoun.
 * @route GET /api/v1/copouns/:id.
 * @access private admins only.
 */
exports.getCopoun = globaLhandler.getOne(Copoun, null);

/** 
  @desc Create copoun.
  @route POST /api/v1/copouns.
  @access private admins only.
*/
exports.createCopoun = globaLhandler.createOne(Copoun);

/** 
  @desc delete copoun by id.
  @route DELETE /api/v1/copouns/:id.
  @access private only admins.
*/
exports.deleteCopoun = globaLhandler.deleteOne(Copoun);

/** 
  @desc update copoun by id.
  @route PATCH /api/v1/copouns/:id.
  @access private only admins.
*/
exports.updateCopoun = globaLhandler.updateOne(Copoun);
