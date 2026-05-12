const mongoose = require('mongoose');

const shippingSchema = new mongoose.Schema({
  governorate: { type: String, required: true, unique: true },
  fee: { type: Number, required: true, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Shipping', shippingSchema);
