const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  urlName: { type: String, unique: true, sparse: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  sortOrder: { type: Number, default: 0 },
  productOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: true });

module.exports = mongoose.model('Collection', collectionSchema);
