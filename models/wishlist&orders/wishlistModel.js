const mongoose = require('mongoose');

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'wishlist should belongs to a user.'],
    unique: true
  },
  products: [
    {
      product: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        required: [true, 'wishlist must contain products. ']
      },
      quantity: {
        type: Number,
        default: 1
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now()
  }
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

module.exports = Wishlist;
