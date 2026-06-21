/**
 * Fix language/level indexes so each module can reuse the same name independently.
 * Run: node backend/scripts/fixContentIndexes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const ensureContentIndexes = require('../utils/ensureContentIndexes');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  await ensureContentIndexes();
  console.log('Done.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
