import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Branch from './src/shared/models/Branch.js';
import User from './src/shared/models/User.js';
import Volunteer from './src/shared/models/Volunteer.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URL;
if (!mongoUri) {
  console.error("MONGODB_URL not found in environment variables");
  process.exit(1);
}

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected to MongoDB successfully");
    
    // Update Rahul Sharma's status to Pending
    const updated = await Volunteer.findOneAndUpdate({ volunteerId: 'VOL00001' }, { status: 'Pending' }, { new: true });
    console.log("Updated volunteer:", updated.volunteerId, updated.fullName, "new status:", updated.status);

    const volunteers = await Volunteer.find().populate('branch', 'name');
    console.log("Total Volunteers in DB:", volunteers.length);
    volunteers.forEach(v => {
      console.log(`- ID: ${v.volunteerId}, Name: ${v.fullName}, Status: ${v.status}`);
    });
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Failed to connect to MongoDB:", err);
  });
