const mongoose = require('mongoose');
const User = require('../../models/user&userAddress/userModel');
const Product = require('../../models/product,brand&review/productModel');
const Address = require('../../models/user&userAddress/addressModel');
const Copoun = require('../../models/copouns&tags/copounModel');
const AppError = require('../../utils/classes/AppError');
const statusCodes = require('../../utils/statusCodes');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'order should belongs to a certain user'],
    validate: {
      validator: async function (val) {
        const userExist = await User.exists({ _id: val });
        return userExist;
      },
      message: 'user is not exist'
    }
  },
  address: {
    type: mongoose.Schema.ObjectId,
    ref: 'Address',
    required: [true, 'you should address for order'],
    validate: {
      validator: async function (val) {
        const addressExist = await Address.exists({ _id: val });
        return addressExist;
      },
      message: 'address is not exist'
    }
  },
  orderDate: {
    type: Number,
    default: Date.now()
  },
  orderedItems: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: [true, 'specifiy a product please.'],
        validate: {
          validator: async function (val) {
            const productExist = await Product.exists({ _id: val });
            return productExist;
          },
          message: 'please use a valid id for product.'
        }
      },
      quantity: {
        type: Number,
        default: 1,
        min: 1
      }
    }
  ],
  total: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'canceled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Card', 'PayPal'], // Enumerate your payment methods
    required: true
  }
});

orderSchema.pre('save', async function (next) {
  try {
    const orderTotal = 0;
    for (const item in this.orderedItems) {
      const orderItem = await Product.findById(item.product).select('price');
      if (orderItem) {
        orderTotal += item.quantity * orderItem.price;
      }
    }
    this.total = orderTotal;

    //check if user add copoun.
    if (this.copoun_code) {
      //find copoun details.
      const copoun_doc = await Copoun.findOne({ code: this.copoun_code });
      if (!copoun_doc) {
        return next(
          new AppError('copoun provided is not valid', statusCodes.badRequest)
        );
      }
      const isCouponExpiredOrInactive =
        copoun_doc.expiredDate.getTime() / 1000 <
          Math.floor(Date.now() / 1000) || !copoun_doc.isActive;

      if (isCouponExpiredOrInactive) {
        return next(
          new AppError(
            'Coupon is expired or not activated yet',
            statusCodes.badRequest
          )
        );
      }

      if (
        copoun_doc.applied_for_entire_order ||
        (this.orderedItems.length === 1 &&
          copoun_doc.eligible_products.includes(this.orderedItems[0].product))
      ) {
        this.total *= 1 - copoun_doc.discountPercentage / 100;
      } else {
        return next(
          new AppError(
            'This coupon is for one product per order. Check product eligibility or contact support.',
            statusCodes.badRequest
          )
        );
      }
    }
    next();
  } catch (err) {
    next(new AppError(err));
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
