const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const reqTime = require('../middleware/reqTime');
const AppError = require('../utils/classes/AppError');
const globalErrorController = require('../controllers/err/globalErrorController');
const orderController = require('../controllers/wishlist&orders/orderController');
const mongoSanitize = require('express-mongo-sanitize');
const statusCodes = require('../utils/statusCodes');
const path = require('path');
const helmet = require('helmet');
const limiter = require('../middleware/rateLimit');

//ROUTERS.
const userRouter = require('../routes/user&userAddress/userRoutes');
const categoryRouter = require('../routes/category&subcategory/categoryRoutes');
const subCategoryRouter = require('../routes/category&subcategory/subCategoryRoutes');
const brandRouter = require('../routes/product,brand&review/brandRoutes');
const productRouter = require('../routes/product,brand&review/productRoutes');
const wishlistRouter = require('../routes/product,brand&review/brandRoutes');
const orderRouter = require('../routes/wishlist&orders/orderRoutes');
const copounRouter = require('../routes/copouns&tags/copounRoutes');

//EXPRESS APP.
const app = express();

//PUT SETTING ON EXPRESS APP.
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

//SERVING STATIC FILES.
app.use(express.static(path.join(__dirname, '../public')));

//SET SOME SECURITY HEADERS.
app.use(helmet());

//SET REQUEST TIME.
app.use(reqTime);

//RUN IN DEVELOPMENT MODE ONLY.
if (process.env.Node_ENV === 'development') app.use(morgan('dev'));

//LIMIT REQUESTS FROM SAME API.
app.use('/api', limiter);

//EVENT LISTENER FOR SUCCESS CHECKOUT.
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  orderController.webhookCheckout
);

//PARSING BODY, COOKIES & URL ENCODED FILES.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//PUT LIMITS AGAINST QUERY INJECTION ATTACKS.
app.use(mongoSanitize());

//ROUTES.
app.use('/api/v1/users', userRouter);
app.use('/api/v1/categories', categoryRouter);
app.use('/api/v1/subcategories', subCategoryRouter);
app.use('/api/v1/brands', brandRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/wishlists', wishlistRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/copouns', copounRouter);

app.all('*', (req, res, next) => {
  const err = new AppError(`can't find url: ${req.url}`, statusCodes.notFound);
  next(err);
});

//GLOBALL ERROR HANDLER.
app.use(globalErrorController);

module.exports = app;
