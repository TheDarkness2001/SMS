/**
 * Inspect and recover orphaned words/sentences after a level was deleted incorrectly.
 *
 * Usage (from backend folder):
 *   set MONGO_URI=your-atlas-connection-string
 *   node scripts/recoverOrphanedContent.js --inspect
 *   node scripts/recoverOrphanedContent.js --recover-sentences --levelId=<levelId>
 *
 * Words deleted by the old bug cannot be recreated from orphans — use MongoDB Atlas
 * point-in-time restore for the words collection if backup is enabled.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const Lesson = require('../models/Lesson');
const Level = require('../models/Level');
const Sentence = require('../models/Sentence');
const Word = require('../models/Word');

function parseArgs(argv) {
  const args = { inspect: false, recoverSentences: false, levelId: null, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--inspect') args.inspect = true;
    else if (arg === '--recover-sentences') args.recoverSentences = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg.startsWith('--levelId=')) args.levelId = arg.split('=')[1];
    else if (arg === '--levelId') args.levelId = argv[i + 1];
  }
  return args;
}

async function getExistingLessonIds() {
  return Lesson.find().distinct('_id');
}

async function findOrphanedSentences() {
  const lessonIds = await getExistingLessonIds();
  return Sentence.find({ lessonId: { $nin: lessonIds } }).lean();
}

async function findOrphanedWords() {
  const lessonIds = await getExistingLessonIds();
  return Word.find({ lessonId: { $nin: lessonIds } }).lean();
}

function groupByLessonId(items) {
  const groups = new Map();
  items.forEach((item) => {
    const key = String(item.lessonId);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return groups;
}

async function inspect() {
  const [sentences, words, lessons, levels] = await Promise.all([
    Sentence.countDocuments(),
    Word.countDocuments(),
    Lesson.countDocuments(),
    Level.find().select('name languageId').populate('languageId', 'name').lean()
  ]);

  const orphanedSentences = await findOrphanedSentences();
  const orphanedWords = await findOrphanedWords();
  const sentenceGroups = groupByLessonId(orphanedSentences);
  const wordGroups = groupByLessonId(orphanedWords);

  console.log('\n=== Database summary ===');
  console.log(`Sentences total: ${sentences}`);
  console.log(`Words total: ${words}`);
  console.log(`Lessons total: ${lessons}`);
  console.log(`Levels total: ${levels.length}`);
  console.log('\nLevels:');
  levels.forEach((level) => {
    console.log(`  - ${level._id} | ${level.name} | ${level.languageId?.name || 'unknown language'}`);
  });

  console.log('\n=== Orphaned content (lesson record missing) ===');
  console.log(`Orphaned sentences: ${orphanedSentences.length} in ${sentenceGroups.size} deleted lesson group(s)`);
  console.log(`Orphaned words: ${orphanedWords.length} in ${wordGroups.size} deleted lesson group(s)`);

  if (sentenceGroups.size > 0) {
    console.log('\nSentence groups (can often be recovered):');
    [...sentenceGroups.entries()].forEach(([lessonId, items], index) => {
      console.log(`  ${index + 1}. old lesson ${lessonId} -> ${items.length} sentence(s)`);
    });
  }

  if (wordGroups.size > 0) {
    console.log('\nWord groups:');
    [...wordGroups.entries()].forEach(([lessonId, items], index) => {
      console.log(`  ${index + 1}. old lesson ${lessonId} -> ${items.length} word(s)`);
    });
  } else {
    console.log('\nNo orphaned words found. Word documents were likely hard-deleted and need Atlas backup restore.');
  }

  if (orphanedSentences.length > 0) {
    console.log('\nTo recover sentences, recreate the level in admin UI if needed, then run:');
    console.log('  node scripts/recoverOrphanedContent.js --recover-sentences --levelId=<levelId>');
  }
}

async function recoverSentences(levelId, dryRun) {
  const level = await Level.findById(levelId);
  if (!level) {
    throw new Error(`Level not found: ${levelId}`);
  }

  const orphanedSentences = await findOrphanedSentences();
  if (orphanedSentences.length === 0) {
    console.log('No orphaned sentences to recover.');
    return;
  }

  const groups = groupByLessonId(orphanedSentences);
  console.log(`Recovering ${orphanedSentences.length} sentence(s) into level "${level.name}" (${groups.size} class group(s))`);

  let order = await Lesson.countDocuments({ levelId, type: 'sentences' }) + 1;
  let recoveredLessons = 0;
  let recoveredSentences = 0;

  for (const [oldLessonId, sentences] of groups.entries()) {
    const lessonName = `Recovered Class ${order}`;
    console.log(`- ${lessonName}: ${sentences.length} sentence(s) from deleted lesson ${oldLessonId}`);

    if (dryRun) {
      order += 1;
      recoveredLessons += 1;
      recoveredSentences += sentences.length;
      continue;
    }

    const lesson = await Lesson.create({
      name: lessonName,
      levelId,
      order,
      type: 'sentences',
      maxWords: Math.max(20, sentences.length)
    });

    await Sentence.updateMany(
      { _id: { $in: sentences.map((sentence) => sentence._id) } },
      { $set: { lessonId: lesson._id } }
    );

    order += 1;
    recoveredLessons += 1;
    recoveredSentences += sentences.length;
  }

  console.log(`Done. Recovered ${recoveredSentences} sentence(s) into ${recoveredLessons} new class(es).`);
  if (dryRun) console.log('Dry run only — no database changes were made.');
}

async function main() {
  const args = parseArgs(process.argv);
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGO_URI in backend/.env or your environment first.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  if (args.inspect) {
    await inspect();
  } else if (args.recoverSentences) {
    if (!args.levelId) {
      console.error('--recover-sentences requires --levelId=<levelId>');
      process.exit(1);
    }
    await recoverSentences(args.levelId, args.dryRun);
  } else {
    console.log('Run with --inspect or --recover-sentences --levelId=<id>');
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
