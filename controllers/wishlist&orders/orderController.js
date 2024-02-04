const UserAddress = require('../../models/user&userAddress/useraddressModel');
const AppError = require('../../utils/classes/AppError');
const Cart = require('../../models/cart/cartModel');
const Order = require('../../models/wishlist&orders/orderModel');
const Product = require('../../models/product,brand&review/productModel');
const Copoun = require('../../models/copouns&tags/copounModel');
const catchAsync = require('../../utils/functions/catchAsync');
const statusCode = require('../../utils/statusCodes');
const globaLhandler = require('../globaLhandler');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

//Abstract Class.
class PaymentProcessor {
  processPayment() {}
}

//Credit & Depit Card.
class CardProcessor extends PaymentProcessor {
  #req;
  #next;
  #paymentMethod;
  constructor(req, next) {
    super();
    this.#req = req;
    this.#next = next;
    this.#paymentMethod = 'Card';
  }

  //overrwrite.
  async processPayment(userAddress, orderedItems, listItems) {
    const copoun_code = this.#req.body.copoun;
    //check if user provide copouns or not.
    if (copoun_code) {
      const copoun_doc = await Copoun.findOne({ code: copoun_code });

      //check if copoun valid.
      if (!copoun_doc) {
        return this.#next(
          new AppError('not valid copoun', statusCode.badRequest)
        );
      }

      const isCouponExpiredOrInactive =
        copoun_doc.expiredDate.getTime() / 1000 <
          Math.floor(Date.now() / 1000) || !copoun_doc.isActive;

      //check if copoun expired or not activated yet.
      if (isCouponExpiredOrInactive) {
        return this.#next(
          new AppError(
            'Coupon is expired or not activated yet',
            statusCode.badRequest
          )
        );
      }

      //check if copoun is for entire order or not.
      if (copoun_doc.applied_for_entire_order) {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: listItems,
          discounts: [{ coupon: copoun_doc.code }],
          mode: 'payment',
          success_url: `${this.#req.protocol}://${this.#req.get('host')}`,
          cancel_url: `${this.#req.protocol}://${this.#req.get('host')}`,
          metadata: {
            userId: this.#req.user._id,
            address: userAddress,
            paymentMethod: this.#paymentMethod,
            purchasedProducts: orderedItems,
            copoun_code: copoun_doc.code
          }
        });
        return session;
      } else {
        return this.#next(
          new AppError(
            'this copoun not applied for entire order',
            statusCode.badRequest
          )
        );
      }
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: listItems,
      mode: 'payment',
      success_url: `${this.#req.protocol}://${this.#req.get('host')}`,
      cancel_url: `${this.#req.protocol}://${this.#req.get('host')}`,
      metadata: {
        userId: this.#req.user._id,
        address: userAddress,
        paymentMethod: this.#paymentMethod,
        purchasedProducts: orderedItems
      }
    });
    return session;
  }
}

//paypal.
class Paypal extends PaymentProcessor {
  //overwrite
  processPayment() {
    //implement paypal payment logic here.
  }
}

//Cash On Delivery.
class COD extends PaymentProcessor {
  #req;
  #next;
  #paymentMethod;
  constructor(req, next) {
    super();
    this.#req = req;
    this.#paymentMethod = 'COD';
    this.#next = next;
  }

  //overrwrite.
  async processPayment(userAddress, orderedItems) {
    const copoun_code = this.#req.body.copoun;
    //create a new order.
    let newOrder = new Order({
      user: this.#req.user._id,
      paymentMethod: this.#paymentMethod,
      address: userAddress,
      orderedItems: orderedItems
    });

    //check if user provide a copoun in body request.
    if (copoun_code) {
      newOrder.copoun_code = copoun_code;
    }

    //save order after run pre_hook middleware.
    newOrder = await newOrder.save();

    //return created order.
    return newOrder;
  }
}

//Payment Factory
class PaymentFactory {
  createNewPayment(paymentMethod, req, next) {
    if (paymentMethod === 'card') {
      return new CardProcessor(req, next);
    } else if (paymentMethod === 'paypal') {
      return new Paypal();
    } else if (paymentMethod === 'COD') {
      return new COD(req, next);
    }
  }
}

const getProductDetails = async (productId) => {
  return await Product.findById(productId).select(
    'name description price coverImage'
  );
};

const validateOrderInputs = (userAddresses, addressId, quantity) => {
  // validate user address input.
  if (!userAddresses || !userAddresses.addresses.includes(addressId)) {
    return next(new AppError('invalid address', statusCode.badRequest));
  }

  // validation for quantity if exist.
  if (quantity <= 0) {
    return next(
      new AppError('quantity input is invalid', statusCode.badRequest)
    );
  }
};

const initializeOrderVariables = (req) => {
  const userId = req.user._id;
  const addressId = req.body.address;
  const productId = req.body.product;
  const quantity = req.body.quantity || 1;

  return { userId, addressId, productId, quantity };
};

/**
 * @desc get current user's orders.
 * @route GET /api/v1/orders/user-orders
 * @access private logged in users only.
 */
exports.getUserOrders = catchAsync(async (req, res, next) => {
  const userId = req.user._id;

  //1) get all orders related to a user.
  const userOrders = await Order.find({ user: userId });

  //2) check if user has an exist orders.
  if (!userOrders) {
    return next(
      new AppError(
        'no orders found, please create an order',
        statusCode.notFound
      )
    );
  }

  //3) send response back to user.
  res.status(statusCode.Success).json({
    status: 'success',
    reqTime: req.reqTime,
    data: {
      data: userOrders
    }
  });
});

/**
 * @desc post a new order for users.
 * @route POST /api/v1/orders/user-orders/
 * @access private loggedin users only.
 */
exports.cashOnDeliveryCheckout = catchAsync(async (req, res, next) => {
  //1) initialize userId, addressId, quantity & productId.
  const { userId, addressId, productId, quantity } =
    initializeOrderVariables(req);

  //2) get current user addresses.
  const userAddresses = await UserAddress.findOne({
    user: userId
  }).select('addresses');

  //3) validate user input.
  validateOrderInputs(userAddresses, addressId, quantity);

  //4) declare orderedItems.
  let orderedItems;

  //5)
  //-if true, then the checkout session will be created for single item.
  //-if false then the checkout session will be created for multiple items in current user cart.
  if (productId) {
    const product = await getProductDetails(productId);

    //check if product is defined or not.
    if (!product) {
      return next(new AppError('Product not found', statusCode.notFound));
    }

    orderedItems = [{ product: product._id, quantity: quantity }];
  } else {
    // get cart of current user.
    const current_user_cart = await Cart.findOne({ user: userId }).select(
      'items total'
    );

    // check if current user have cart or not.
    if (!current_user_cart) {
      return next(
        new AppError(
          'please choose at least one product to purchase',
          statusCode.badRequest
        )
      );
    }

    // orderedItems.
    orderedItems = [];

    // for loop.
    for (let item in current_user_cart.items) {
      const product_doc = await getProductDetails(item.product);

      orderedItems.push({
        product: product_doc._id,
        quantity: item.quantity
      });
    }
  }

  //6) create a cod checkout.
  const paymentFactory = new PaymentFactory();
  const cod = paymentFactory.createNewPayment('COD', req, next);
  const newOrder = await cod.processPayment(addressId, orderedItems);

  //7) sending response.
  res.status(statusCode.Created).json({
    status: 'success',
    data: {
      newOrder
    }
  });
});

/**
 * @desc create checkout session for single product & multiple product items.
 * -handle creating checkout session for two  scenarios:-
 * 1)if user checkout one product.
 * 2)if user checkout multiple products in his cart.
 * @route POST /api/v1/orders/checkout-session
 * body: {product: *productId*, address: *addressId*, quantity:*quantity*, copoun: *code*}
 * @access private loggedin users.
 */
exports.createCheckoutSession = catchAsync(async (req, res, next) => {
  // initialize userId, addressId, quantity & productId.
  const { userId, addressId, productId, quantity } =
    initializeOrderVariables(req);

  // get current user addresses.
  const userAddresses = await UserAddress.findOne({
    user: userId
  }).select('addresses');

  // validate user input.
  validateOrderInputs(userAddresses, addressId, quantity);

  // declare listItems, orderedItems.
  let listItems, orderedItems;

  //-if true, then the checkout session will be created for single item.
  //-if false then the checkout session will be created for multiple items in current user cart.
  if (productId) {
    const product = await getProductDetails(productId);

    //check if product is defined or not.
    if (!product) {
      return next(new AppError('Product not found', statusCode.notFound));
    }

    //listItems.
    listItems = [
      {
        price_data: {
          currency: 'egp',
          product_data: {
            name: product.name,
            description: product.description
          },
          unit_amount: product.price * 100 // Amount in piasters (1 EGP = 100 piasters), e.g., 300.00 EGP
        },
        quantity: quantity
      }
    ];
    orderedItems = [{ product: product._id, quantity: quantity }];
  } else {
    // get cart of current user.
    const current_user_cart = await Cart.findOne({ user: userId }).select(
      'items total'
    );

    // check if current user have cart or not.
    if (!current_user_cart) {
      return next(
        new AppError(
          'please choose at least one product to purchase',
          statusCode.notFound
        )
      );
    }

    //initialize listItems, orderedItems.
    listItems = [];
    orderedItems = [];

    // for loop.
    for (let item in current_user_cart.items) {
      const cartProduct = await getProductDetails(item.product);

      listItems.push({
        price_data: {
          currency: 'egp',
          product_data: {
            name: cartProduct.name,
            description: cartProduct.description
          },
          unit_amount: cartProduct.price * 100
        },
        quantity: item.quantity
      });

      orderedItems.push({
        product: cartProduct._id,
        quantity: item.quantity
      });
    }
  } //if statement end.

  //6) create a checkout session.
  const paymentFactory = new PaymentFactory();
  const cardProcessor = paymentFactory.createNewPayment('card', req, next);
  const session = await cardProcessor.processPayment(
    addressId,
    orderedItems,
    listItems
  );

  //7) sending response.
  res.status(statusCode.Success).json({
    status: 'success',
    session
  });
});

/**
 * @desc webhook checkout function that run in completed stripe checkout.
 * @route don't have a route.
 * @access private loggedin users in completed checkout only.
 */
exports.webhookCheckout = (req, res, next) => {
  const sig = req.headers['stripe-signature'];

  //createOrderCheckout fun.
  const createOrderCheckout = async (session) => {
    const newOrder = new Order({
      user: session.metadata.userId,
      address: session.metadata.address,
      orderedItems: session.metadata.purchasedProducts,
      paymentMethod: session.metadata.paymentMethod
    });

    if (session.metadata.copoun_code) {
      newOrder.copoun_code = session.metadata.copoun_code;
    }

    await newOrder.save();
  };

  //intitialize event.
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    res.status(statusCode.badRequest).send(`Webhook Error: ${err.message}`);
    return;
  }

  //if checkout is completed.
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    createOrderCheckout(session);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(statusCode.Success).json({ received: true });
};

/**
 * @desc get all orders.
 * @route GET /api/v1/orders/admin-orders
 * @access private admins only.
 */
exports.getAllOrders = globaLhandler.getAll(Order);

/**
 * @desc create new order.
 * @route POST /api/v1/orders/admin-orders
 * @access private admins only.
 */
exports.createOrder = globaLhandler.createOne(Order);

/**
 * @desc get order by id.
 * @route GET /api/v1/orders/admin-orders/:id
 * @access private admins only.
 */
exports.getOrder = globaLhandler.getOne(Order);

/**
 * @desc update order by id.
 * @route PATCH /api/v1/orders/admin-orders/:id
 * @access private admins only.
 */
exports.updateOrder = globaLhandler.updateOne(Order);

/**
 * @desc delete order by id.
 * @route DELETE /api/v1/orders/admin-orders/:id
 * @access private admins only.
 */
exports.deleteOrder = globaLhandler.deleteOne(Order);
