const mongoose = require('mongoose');
const Product = require('../product,brand&review/productModel');

const copounSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'please provide a code'],
    unique: [true, 'this copoun is already exist']
  },
  discountPercentage: {
    type: Number,
    min: [0, 'not valid percentage, percentage below zero'],
    max: [100, 'not valid percentage, percentage above 100%']
  },
  stratedDate: {
    type: Number,
    default: Date.now()
  },
  expiredDate: {
    type: Date,
    required: [true, 'please provide expired date']
  },
  applied_for_entire_order: {
    type: Boolean,
    default: false
  },
  eligible_products: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Product',
      validate: {
        validator: async function (val) {
          const productExist = await Product.exists({ _id: val });
          return productExist;
        },
        message: 'product id is not valid'
      }
    }
  ],
  isActive: {
    type: Boolean,
    default: true
  }
});

const Copoun = mongoose.model('Copoun', copounSchema);

module.exports = Copoun;
