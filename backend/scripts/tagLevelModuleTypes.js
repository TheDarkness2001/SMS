/**
 * Tag legacy levels (no moduleType) based on their lesson content.
 * Run: node backend/scripts/tagLevelModuleTypes.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Level = require('../models/Level');
const Lesson = require('../models/Lesson');

async function inferModuleType(levelId) {
  const lessons = await Lesson.find({ levelId }).select('type').lean();
  if (!lessons.length) return null;

  const types = new Set(
    lessons.map((lesson) => (lesson.type === 'words' || !lesson.type ? 'words' : lesson.type))
  );

  if (types.size === 1) return [...types][0];
  return null;
}

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const levels = await Level.find({
    $or: [{ moduleType: { $exists: false } }, { moduleType: null }]
  });

  let updated = 0;
  for (const level of levels) {
    const moduleType = await inferModuleType(level._id);
    if (!moduleType) {
      console.log(`Skip ${level.name} (${level._id}) — mixed or empty lessons`);
      continue;
    }
    level.moduleType = moduleType;
    await level.save();
    updated += 1;
    console.log(`Tagged ${level.name} -> ${moduleType}`);
  }

  console.log(`Done. Updated ${updated} level(s).`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
