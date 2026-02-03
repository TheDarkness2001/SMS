const mongoose = require('mongoose');
require('dotenv').config();

// Source: Localhost MongoDB
const SOURCE_URI = 'mongodb://localhost:27017/student_management_system';

// Destination: MongoDB Atlas (from .env)
const DEST_URI = process.env.MONGO_URI;

// Collections to migrate
const COLLECTIONS = [
  'branches',
  'teachers',
  'students',
  'subjects',
  'classes',
  'classschedules',
  'examgroups',
  'exams',
  'payments',
  'attendances',
  'studentattendances',
  'feedbacks',
  'timetables',
  'settings',
  'salarypayouts',
  'teacherearnings',
  'staffaccounts',
  'parentnotificationsettings',
  'notificationlogs',
  'wallets',
  'wallettransactions',
  'attendanceaudits'
];

async function migrateData() {
  let sourceConn, destConn;

  try {
    console.log('🔄 Starting migration from Localhost to Atlas...\n');

    // Connect to source (localhost)
    console.log('📍 Connecting to localhost MongoDB...');
    sourceConn = await mongoose.createConnection(SOURCE_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).asPromise();
    console.log('✅ Connected to localhost\n');

    // Connect to destination (Atlas)
    console.log('📍 Connecting to MongoDB Atlas...');
    destConn = await mongoose.createConnection(DEST_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).asPromise();
    console.log('✅ Connected to Atlas\n');

    // Get source database
    const sourceDb = sourceConn.db;
    const destDb = destConn.db;

    // Get all collections from source
    const collections = await sourceDb.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log(`📦 Found ${collectionNames.length} collections in localhost:\n`);
    console.log(collectionNames.map(name => `   - ${name}`).join('\n'));
    console.log('\n');

    let totalDocuments = 0;
    let migratedCollections = 0;

    // Migrate each collection
    for (const collectionName of collectionNames) {
      try {
        // Skip system collections
        if (collectionName.startsWith('system.')) {
          console.log(`⏭️  Skipping system collection: ${collectionName}`);
          continue;
        }

        console.log(`\n🔄 Migrating collection: ${collectionName}`);

        // Get data from source
        const sourceCollection = sourceDb.collection(collectionName);
        const documents = await sourceCollection.find({}).toArray();

        if (documents.length === 0) {
          console.log(`   ⚠️  Collection is empty, skipping...`);
          continue;
        }

        console.log(`   📊 Found ${documents.length} documents`);

        // Clear destination collection (optional - comment out if you want to preserve existing data)
        const destCollection = destDb.collection(collectionName);
        const existingCount = await destCollection.countDocuments();
        
        if (existingCount > 0) {
          console.log(`   ⚠️  Destination has ${existingCount} existing documents`);
          console.log(`   🗑️  Clearing destination collection...`);
          await destCollection.deleteMany({});
        }

        // Insert documents into destination
        console.log(`   ⬆️  Inserting ${documents.length} documents...`);
        await destCollection.insertMany(documents, { ordered: false });

        console.log(`   ✅ Successfully migrated ${documents.length} documents`);
        
        totalDocuments += documents.length;
        migratedCollections++;

      } catch (error) {
        console.error(`   ❌ Error migrating ${collectionName}:`, error.message);
      }
    }

    console.log('\n');
    console.log('='.repeat(60));
    console.log('🎉 Migration Complete!');
    console.log('='.repeat(60));
    console.log(`✅ Migrated ${migratedCollections} collections`);
    console.log(`✅ Total documents migrated: ${totalDocuments}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close connections
    if (sourceConn) await sourceConn.close();
    if (destConn) await destConn.close();
    console.log('\n✅ Connections closed');
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
