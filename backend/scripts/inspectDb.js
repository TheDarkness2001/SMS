const mongoose = require('mongoose');

const uri = process.argv[2] || process.env.MONGO_URI;
if (!uri) {
  console.error('No MONGO_URI provided');
  process.exit(1);
}

async function main() {
  await mongoose.connect(uri);

  const Word = require('../models/Word');
  const Sentence = require('../models/Sentence');
  const Lesson = require('../models/Lesson');
  const Level = require('../models/Level');
  const Language = require('../models/Language');

  console.log('=== Current database state ===');
  console.log('words:', await Word.countDocuments());
  console.log('sentences:', await Sentence.countDocuments());
  console.log('lessons:', await Lesson.countDocuments());
  console.log('levels:', await Level.countDocuments());
  console.log('languages:', await Language.countDocuments());

  const byType = await Lesson.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);
  console.log('lessons by type:', byType);

  const levels = await Level.find().populate('languageId', 'name').lean();
  console.log('\nLevels:');
  levels.forEach((level) => {
    console.log(`- ${level.name} (${level.languageId?.name || 'no lang'})`);
  });

  const orphanedSentences = await Sentence.countDocuments({
    lessonId: { $nin: (await Lesson.find({ type: 'sentences' }).distinct('_id')) }
  });
  const orphanedWords = await Word.countDocuments({
    _id: { $nin: (await Lesson.find({ type: 'words' }).distinct('wordIds')).flat() }
  });

  console.log('\nOrphaned sentences (no sentence lesson):', orphanedSentences);
  console.log('Orphaned words check skipped if no word lessons');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
