const mongoose = require('mongoose');
const slugify = require('slugify');

const categoriesSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'please sepecifiy category name.'],
    unique: [true, 'this category is already exist!'],
    trim: true,
    minlength: [3, 'too short category name'],
    maxlength: [32, 'too long category name'],
    set: function (val) {
      return val[0].toUpperCase() + val.slice(1);
    }
  },
  createdAt: {
    type: Date,
    default: Date.now()
  },
  slug: String,
  image: String,
  description: {
    type: String,
    default: ''
  }
});

categoriesSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

const Category = mongoose.model('Category', categoriesSchema);

module.exports = Category;
