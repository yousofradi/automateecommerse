const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.DB_URI;
    if (!uri) {
      console.error('ERROR: DB_URI environment variable is not set');
      process.exit(1);
    }
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
