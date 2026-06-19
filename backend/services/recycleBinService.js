const { randomUUID } = require('crypto');
const RecycleBin = require('../models/RecycleBin');
const Snapshot = require('../models/Snapshot');
const Language = require('../models/Language');
const Level = require('../models/Level');
const Lesson = require('../models/Lesson');
const Word = require('../models/Word');
const Sentence = require('../models/Sentence');
const ListeningExercise = require('../models/ListeningExercise');

const MODEL_REGISTRY = {
  languages: Language,
  levels: Level,
  lessons: Lesson,
  words: Word,
  sentences: Sentence,
  listeningexercises: ListeningExercise
};

const CONTENT_MODELS = [Language, Level, Lesson, Word, Sentence, ListeningExercise];

function getModelByCollection(collectionName) {
  const key = String(collectionName || '').toLowerCase();
  return MODEL_REGISTRY[key] || null;
}

function getCollectionName(Model) {
  return Model.collection.collectionName;
}

function getDeletedBy(options = {}) {
  return options.deletedBy || options.user?.email || options.user?.name || options.user?.id || 'system';
}

function validateMassDelete(count, options = {}) {
  if (count > 100 && !options.force) {
    const error = new Error('More than 100 records would be affected. Pass force=true to continue.');
    error.code = 'MASS_DELETE_BLOCKED';
    error.statusCode = 400;
    throw error;
  }
  if (count > 20 && options.confirmText !== 'DELETE') {
    const error = new Error('Type DELETE to confirm deleting more than 20 records.');
    error.code = 'CONFIRMATION_REQUIRED';
    error.statusCode = 400;
    throw error;
  }
}

async function createSnapshot(Model, document, action, createdBy) {
  if (!document?._id) return null;
  const sourceCollection = getCollectionName(Model);
  const latest = await Snapshot.findOne({ sourceCollection, sourceId: document._id })
    .sort({ version: -1 })
    .select('version')
    .lean();
  return Snapshot.create({
    sourceCollection,
    sourceId: document._id,
    version: (latest?.version || 0) + 1,
    action,
    data: document.toObject ? document.toObject() : document,
    createdBy: createdBy || 'system'
  });
}

async function resolveDisplayMeta(Model, doc) {
  const collectionName = getCollectionName(Model);
  let displayName = doc.name || doc.title || doc.english || String(doc._id);
  let displayType = collectionName;
  let languageName = '';

  if (collectionName === 'levels' && doc.languageId) {
    const language = await Language.findById(doc.languageId).select('name').lean();
    languageName = language?.name || '';
    displayType = 'level';
  } else if (collectionName === 'lessons') {
    displayType = doc.type || 'lesson';
    if (doc.levelId) {
      const level = await Level.findById(doc.levelId).populate('languageId', 'name').lean();
      languageName = level?.languageId?.name || '';
      displayName = doc.name || displayName;
    }
  } else if (collectionName === 'words' || collectionName === 'sentences') {
    displayName = doc.english || displayName;
    displayType = collectionName === 'words' ? 'word' : 'sentence';
    if (doc.lessonId) {
      const lesson = await Lesson.findById(doc.lessonId).populate({ path: 'levelId', populate: { path: 'languageId', select: 'name' } }).lean();
      languageName = lesson?.levelId?.languageId?.name || '';
    }
  } else if (collectionName === 'listeningexercises') {
    displayType = 'listening';
    displayName = doc.title || displayName;
    if (doc.lessonId) {
      const lesson = await Lesson.findById(doc.lessonId).populate({ path: 'levelId', populate: { path: 'languageId', select: 'name' } }).lean();
      languageName = lesson?.levelId?.languageId?.name || '';
    }
  } else if (collectionName === 'languages') {
    displayType = 'language';
    languageName = doc.name || '';
  }

  return { displayName, displayType, languageName };
}

async function archiveToRecycleBin(Model, doc, options = {}) {
  const collectionName = getCollectionName(Model);
  const meta = await resolveDisplayMeta(Model, doc);
  await createSnapshot(Model, doc, 'delete', getDeletedBy(options));

  return RecycleBin.create({
    originalId: doc._id,
    collectionName,
    displayName: meta.displayName,
    displayType: meta.displayType,
    languageName: meta.languageName,
    data: doc.toObject ? doc.toObject() : doc,
    deletedAt: new Date(),
    deletedBy: getDeletedBy(options),
    cascadeGroupId: options.cascadeGroupId || null,
    parentRecycleId: options.parentRecycleId || null
  });
}

async function softDeleteDocument(Model, document, options = {}) {
  if (!document || document.isDeleted) return null;

  const recycleEntry = await archiveToRecycleBin(Model, document, options);
  document.isDeleted = true;
  document.deletedAt = new Date();
  document.deletedBy = getDeletedBy(options);
  await document.save();

  return recycleEntry;
}

async function softDeleteById(Model, id, options = {}) {
  const doc = await Model.findByIdIncludingDeleted(id);
  if (!doc || doc.isDeleted) return null;
  return softDeleteDocument(Model, doc, options);
}

async function softDeleteMany(Model, filter, options = {}) {
  const docs = await Model.find(filter).setOptions({ includeDeleted: true });
  const activeDocs = docs.filter((doc) => !doc.isDeleted);
  validateMassDelete(activeDocs.length, options);

  const entries = [];
  const cascadeGroupId = options.cascadeGroupId || (activeDocs.length > 1 ? randomUUID() : null);

  for (const doc of activeDocs) {
    const entry = await softDeleteDocument(Model, doc, { ...options, cascadeGroupId });
    if (entry) entries.push(entry);
  }
  return entries;
}

async function softDeleteLessonContent(lesson, options = {}) {
  const entries = [];

  if (lesson.type === 'listening') {
    entries.push(...await softDeleteMany(ListeningExercise, { lessonId: lesson._id }, options));
  } else if (lesson.type === 'sentences') {
    entries.push(...await softDeleteMany(Sentence, { lessonId: lesson._id }, options));
  } else {
    if (lesson.wordIds?.length) {
      entries.push(...await softDeleteMany(Word, { _id: { $in: lesson.wordIds } }, options));
    }
    const linkedWords = await Word.find({ lessonId: lesson._id });
    if (linkedWords.length) {
      entries.push(...await softDeleteMany(Word, { lessonId: lesson._id }, options));
    }
  }

  return entries;
}

async function softDeleteLessonById(lessonId, options = {}) {
  const lesson = await Lesson.findByIdIncludingDeleted(lessonId);
  if (!lesson || lesson.isDeleted) return { lessonEntry: null, childEntries: [] };
  const childEntries = await softDeleteLessonContent(lesson, options);
  const lessonEntry = await softDeleteDocument(Lesson, lesson, options);
  return { lessonEntry, childEntries };
}

async function softDeleteLessonsByFilter(filter, options = {}) {
  const lessons = await Lesson.find(filter);
  validateMassDelete(lessons.length, options);
  const cascadeGroupId = options.cascadeGroupId || randomUUID();
  let deletedCount = 0;
  const recycleEntries = [];

  for (const lesson of lessons) {
    const childEntries = await softDeleteLessonContent(lesson, { ...options, cascadeGroupId });
    const lessonEntry = await softDeleteDocument(Lesson, lesson, { ...options, cascadeGroupId });
    recycleEntries.push(lessonEntry, ...childEntries);
    deletedCount += 1;
  }

  return { deletedCount, recycleEntries, cascadeGroupId };
}

async function softDeleteLevelById(levelId, options = {}) {
  const level = await Level.findByIdIncludingDeleted(levelId);
  if (!level || level.isDeleted) return null;

  const cascadeGroupId = options.cascadeGroupId || randomUUID();
  const lessonResult = await softDeleteLessonsByFilter({ levelId }, { ...options, cascadeGroupId });
  const levelEntry = await softDeleteDocument(Level, level, { ...options, cascadeGroupId });

  return {
    levelEntry,
    cascadeGroupId,
    deletedLessons: lessonResult.deletedCount,
    recycleEntries: [levelEntry, ...lessonResult.recycleEntries].filter(Boolean)
  };
}

async function softDeleteLessonsForLevelByType(levelId, lessonType, options = {}) {
  return softDeleteLessonsByFilter({ levelId, type: lessonType }, options);
}

async function softDeleteLessonsForLanguageByType(languageId, lessonType, options = {}) {
  const levels = await Level.find({ languageId }).select('_id');
  let deletedCount = 0;
  const recycleEntries = [];
  const cascadeGroupId = options.cascadeGroupId || randomUUID();

  for (const level of levels) {
    const result = await softDeleteLessonsByFilter(
      { levelId: level._id, type: lessonType },
      { ...options, cascadeGroupId }
    );
    deletedCount += result.deletedCount;
    recycleEntries.push(...result.recycleEntries);
  }

  return { deletedCount, recycleEntries, cascadeGroupId };
}

async function softDeleteLanguageById(languageId, options = {}) {
  const language = await Language.findByIdIncludingDeleted(languageId);
  if (!language || language.isDeleted) return null;

  const cascadeGroupId = options.cascadeGroupId || randomUUID();
  const levels = await Level.find({ languageId });
  validateMassDelete(levels.length + 1, options);

  const recycleEntries = [];
  for (const level of levels) {
    const result = await softDeleteLevelById(level._id, { ...options, cascadeGroupId });
    if (result?.levelEntry) recycleEntries.push(result.levelEntry, ...result.recycleEntries);
  }

  const languageEntry = await softDeleteDocument(Language, language, { ...options, cascadeGroupId });
  recycleEntries.push(languageEntry);

  return { languageEntry, cascadeGroupId, recycleEntries: recycleEntries.filter(Boolean) };
}

async function restoreRecycleEntry(recycleBinId, options = {}) {
  const entry = await RecycleBin.findById(recycleBinId);
  if (!entry) {
    const error = new Error('Recycle bin entry not found');
    error.statusCode = 404;
    throw error;
  }
  if (entry.restoredAt || entry.purgedAt) {
    const error = new Error('This item cannot be restored');
    error.statusCode = 400;
    throw error;
  }

  const Model = getModelByCollection(entry.collectionName);
  if (!Model) {
    const error = new Error(`Unsupported collection: ${entry.collectionName}`);
    error.statusCode = 400;
    throw error;
  }

  const restoredBy = getDeletedBy(options);
  const payload = { ...entry.data };
  delete payload.__v;
  payload.isDeleted = false;
  payload.deletedAt = null;
  payload.deletedBy = null;

  let doc = await Model.findByIdIncludingDeleted(entry.originalId);
  if (doc) {
    doc.set(payload);
    await doc.save();
  } else {
    doc = await Model.create(payload);
  }

  await createSnapshot(Model, doc, 'restore', restoredBy);
  entry.restoredAt = new Date();
  entry.restoredBy = restoredBy;
  await entry.save();

  if (entry.cascadeGroupId && options.restoreCascade !== false) {
    const siblings = await RecycleBin.find({
      cascadeGroupId: entry.cascadeGroupId,
      restoredAt: null,
      purgedAt: null,
      _id: { $ne: entry._id }
    }).sort({ deletedAt: 1 });

    for (const sibling of siblings) {
      await restoreRecycleEntry(sibling._id, { ...options, restoreCascade: false });
    }
  }

  return { entry, document: doc };
}

async function purgeRecycleEntry(recycleBinId, options = {}) {
  const entry = await RecycleBin.findById(recycleBinId);
  if (!entry) {
    const error = new Error('Recycle bin entry not found');
    error.statusCode = 404;
    throw error;
  }
  if (entry.purgedAt) return entry;

  entry.purgedAt = new Date();
  entry.purgedBy = getDeletedBy(options);
  await entry.save();

  const Model = getModelByCollection(entry.collectionName);
  if (Model) {
    await createSnapshot(Model, entry.data, 'purge', getDeletedBy(options));
  }

  return entry;
}

async function snapshotBeforeUpdate(Model, doc, updatedBy) {
  if (!doc) return null;
  return createSnapshot(Model, doc, 'update', updatedBy);
}

function registerUpdateSnapshotHooks() {
  CONTENT_MODELS.forEach((Model) => {
    Model.schema.pre('findOneAndUpdate', async function preUpdateSnapshot() {
      const docToUpdate = await Model.findById(this.getQuery()._id || this.getQuery().id);
      if (docToUpdate) {
        await createSnapshot(Model, docToUpdate, 'update', 'system');
      }
    });
  });
}

module.exports = {
  MODEL_REGISTRY,
  CONTENT_MODELS,
  getModelByCollection,
  validateMassDelete,
  createSnapshot,
  snapshotBeforeUpdate,
  softDeleteById,
  softDeleteMany,
  softDeleteDocument,
  softDeleteLessonById,
  softDeleteLessonsByFilter,
  softDeleteLevelById,
  softDeleteLanguageById,
  softDeleteLessonsForLevelByType,
  softDeleteLessonsForLanguageByType,
  restoreRecycleEntry,
  purgeRecycleEntry,
  registerUpdateSnapshotHooks
};
