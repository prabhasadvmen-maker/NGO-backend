import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Volunteer from '../src/shared/models/Volunteer.js';

async function deleteAllVolunteers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✓ Connected to MongoDB');

    // Delete all volunteers
    const result = await Volunteer.deleteMany({});

    console.log(`✓ Successfully deleted ${result.deletedCount} volunteer records`);
    console.log('✓ Volunteer collection is now empty');

    // Close connection
    await mongoose.connection.close();
    console.log('✓ Database connection closed');

    process.exit(0);
  } catch (error) {
    console.error('✗ Error deleting volunteers:', error.message);
    process.exit(1);
  }
}

// Run migration
deleteAllVolunteers();
