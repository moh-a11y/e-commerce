const mongoose = require('mongoose');
const User = require('../../models/user&userAddress/userModel');
const Product = require('../../models/product,brand&review/productModel');
const Address = require('../../models/user&userAddress/addressModel');
const AppError = require('../../utils/classes/AppError');

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
        required: [true, ''],
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
      const orderItem = await Product.findById(item.product);
      if (orderItem) {
        orderTotal += item.quantity * orderItem.price;
      }
    }
    this.total = orderTotal;
    next();
  } catch (err) {
    next(new AppError(err));
  }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
