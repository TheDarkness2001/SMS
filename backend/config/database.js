const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Try to connect to local MongoDB first
    await mongoose.connect('mongodb://localhost:27017/student_management_system');
    console.log('Local MongoDB connected successfully');
  } catch (error) {
    console.log('Local MongoDB not available, using in-memory MongoDB...');
    try {
      // Use in-memory MongoDB as fallback
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      
      await mongoose.connect(uri);
      console.log('In-memory MongoDB connected successfully');
    } catch (memError) {
      console.error('Failed to connect to both local and in-memory MongoDB:', memError);
      process.exit(1);
    }
  }
};

module.exports = connectDB;