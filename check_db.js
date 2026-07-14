import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/shared/models/User.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URL;
if (!mongoUri) {
  console.error("MONGODB_URL not found in environment variables");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected to MongoDB successfully");
    
    // Find the admin user and update their password
    const adminUser = await User.findOne({ email: 'prabhas.advmen@gmail.com' });
    if (adminUser) {
      adminUser.password = 'admin@000'; // Mongoose pre-save hook will bcrypt it
      await adminUser.save();
      console.log("Updated password for admin user prabhas.advmen@gmail.com to 'admin@000'");
    } else {
      console.log("Admin user prabhas.advmen@gmail.com not found!");
    }
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB:", err);
  });
