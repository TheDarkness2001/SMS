const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use MongoDB Atlas if MONGO_URI is provided
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/student_management_system';
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    if (process.env.MONGO_URI) {
      console.log('✅ MongoDB Atlas connected successfully');
      console.log('📊 Database:', mongoose.connection.name);
    } else {
      console.log('✅ Local MongoDB connected successfully');
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Only try in-memory fallback if no MONGO_URI is provided
    if (!process.env.MONGO_URI) {
      console.log('⚠️  Attempting in-memory MongoDB fallback...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();
        const uri = mongod.getUri();
        
        await mongoose.connect(uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        console.log('✅ In-memory MongoDB connected successfully');
      } catch (memError) {
        console.error('❌ Failed to connect to any MongoDB instance:', memError.message);
        process.exit(1);
      }
    } else {
      console.error('💡 Please check your MONGO_URI connection string and database password');
      process.exit(1);
    }
  }
};

module.exports = connectDB;