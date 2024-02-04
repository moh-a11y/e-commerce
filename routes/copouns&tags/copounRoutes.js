const express = require('express');

//CONTROLLERS.
const authController = require('../../controllers/auth&users/authController');
const copounController = require('../../controllers/copouns&tags/copounsController');

//MIDDLEWARES.
const createFilterObj = require('../../middleware/createFilterObj');

//COPOUN_ROUTER.
const router = express.Router();

//PROTECT MIDDLWARE FOR LOGED IN USERS ONLY.
router.use(authController.protect);

//RESTRICT ACCESS TO ROUTES BASED ON USER ROLES (admin).
router.use(authController.restricTo(['admin']));

//ROUTES.
router
  .route('/')
  .get(createFilterObj.setEmptyObj, copounController.getAllCopouns)
  .post(copounController.createCopoun);

router
  .route('/:id')
  .get(copounController.getCopoun)
  .patch(copounController.updateCopoun);

module.exports = router;
