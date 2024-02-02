const express = require('express');

//CONTROLLERS.
const categoryController = require('../../controllers/category&subcategory/categoryController');
const authController = require('../../controllers/auth&users/authController');

//ROUTERS.
const subCategoryRouter = require('./subCategoryRoutes');
const brandRouter = require('../product,brand&review/brandRoutes');
const productRouter = require('../product,brand&review/productRoutes');

//MIDDLEWARES.
const uploadPhoto = require('../../middleware/ImgUpload');
const createFilterObj = require('../../middleware/createFilterObj');

//FUNCTIONS.
const resizePhoto = uploadPhoto.resizePhoto('category');

//CATEGORY ROUTER.
const router = express.Router();

//NESTED ROUTES.
router.use('/:categoryIdForSubCategories/subcategories', subCategoryRouter);
router.use('/:categoryIdForBrands/brands', brandRouter);
router.use('/:categoryIdForBrands/:subCategoryIdForBrands/brands', brandRouter);
router.use('/:categoryIdForProducts/products', productRouter);
router.use(
  '/:categoryIdForProducts/:subCategoryIdForProducts/products',
  productRouter
);

//ROUTES.
router
  .route('/')
  .get(createFilterObj.setEmptyObj, categoryController.getAllCategories)
  .post(
    authController.protect,
    authController.restricTo(['admin']),
    categoryController.createCategory
  );

router
  .route('/:id')
  .get(categoryController.getCategory)
  .delete(
    authController.protect,
    authController.restricTo(['admin']),
    categoryController.deleteCategory
  )
  .patch(
    authController.protect,
    authController.restricTo(['admin']),
    uploadPhoto.uploadSinglePhoto,
    resizePhoto,
    uploadPhoto.addImgNameToBody,
    categoryController.updateCategory
  );

module.exports = router;
