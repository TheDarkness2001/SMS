const { randomUUID } = require('crypto');
const RecycleBin = require('../models/RecycleBin');
const Snapshot = require('../models/Snapshot');
const Language = require('../models/Language');
const Level = require('../models/Level');
const Lesson = require('../models/Lesson');
const Word = require('../models/Word');
const Sentence = require('../models/Sentence');
const ListeningExercise = require('../models/ListeningExercise');
const {
  buildModuleTypeFilter,
  buildLessonTypeFilter,
  filterLevelsForModule,
  resolveScopedLevelDelete
} = require('../utils/lessonTypes');

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

const MASS_DELETE_CONFIRM_THRESHOLD = 20;
const MASS_DELETE_FORCE_THRESHOLD = 200;

function getDeletedBy(options = {}) {
  return options.deletedBy || options.user?.email || options.user?.name || options.user?.id || 'system';
}

function validateMassDelete(count, options = {}) {
  if (count > MASS_DELETE_FORCE_THRESHOLD && !options.force) {
    const error = new Error(`More than ${MASS_DELETE_FORCE_THRESHOLD} records would be affected. Pass force=true to continue.`);
    error.code = 'MASS_DELETE_BLOCKED';
    error.statusCode = 400;
    throw error;
  }
  if (count > MASS_DELETE_CONFIRM_THRESHOLD && options.confirmText !== 'DELETE') {
    const error = new Error(`Type DELETE to confirm deleting more than ${MASS_DELETE_CONFIRM_THRESHOLD} records.`);
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
  return softDeleteLessonsByFilter({ levelId, ...buildLessonTypeFilter(lessonType) }, options);
}

async function softDeleteLessonsForLanguageByType(languageId, lessonType, options = {}) {
  const levels = await Level.find({ languageId, ...buildModuleTypeFilter(lessonType) });
  let scopedLevels = await filterLevelsForModule(levels, lessonType);
  let deletedCount = 0;
  const recycleEntries = [];
  const cascadeGroupId = options.cascadeGroupId || randomUUID();

  for (const level of scopedLevels) {
    const result = await resolveScopedLevelDelete(level, lessonType, { ...options, cascadeGroupId }, {
      softDeleteLevelById,
      softDeleteLessonsForLevelByType
    });
    if (result?.retagged) continue;
    if (result?.levelEntry) {
      recycleEntries.push(result.levelEntry, ...(result.recycleEntries || []));
      deletedCount += result.deletedLessons ?? 1;
    } else if (result?.recycleEntries?.length) {
      recycleEntries.push(...result.recycleEntries);
      deletedCount += result.deletedCount ?? 0;
    }
  }

  return { deletedCount, recycleEntries, cascadeGroupId };
}

async function softDeleteLanguageForModule(languageId, moduleType, options = {}) {
  const language = await Language.findById(languageId);
  if (!language) return null;

  let levels = await Level.find({ languageId, ...buildModuleTypeFilter(moduleType) });
  levels = await filterLevelsForModule(levels, moduleType);

  if (levels.length) {
    validateMassDelete(levels.length, options);
  }

  const cascadeGroupId = options.cascadeGroupId || randomUUID();
  const recycleEntries = [];
  let deletedLevels = 0;

  for (const level of levels) {
    const result = await resolveScopedLevelDelete(level, moduleType, { ...options, cascadeGroupId }, {
      softDeleteLevelById,
      softDeleteLessonsForLevelByType: softDeleteLessonsForLevelByType
    });
    if (result?.retagged) continue;
    deletedLevels += 1;
    if (result?.levelEntry) {
      recycleEntries.push(result.levelEntry, ...(result.recycleEntries || []));
    } else if (result?.recycleEntries?.length) {
      recycleEntries.push(...result.recycleEntries);
    }
  }

  const remainingCount = await Level.countDocuments({ languageId });
  if (remainingCount === 0) {
    const languageEntry = await softDeleteDocument(Language, language, { ...options, cascadeGroupId });
    recycleEntries.push(languageEntry);
    return { languageEntry, deletedLevels, recycleEntries, cascadeGroupId };
  }

  return { deletedLevels, recycleEntries, cascadeGroupId, removedFromModule: true };
}

async function resolveScopedLanguageDelete(language, moduleType, options = {}) {
  if (language.moduleType === moduleType) {
    return softDeleteLanguageById(language._id, options);
  }

  if (language.moduleType && language.moduleType !== moduleType) {
    return softDeleteLanguageForModule(language._id, moduleType, options);
  }

  const allLevels = await Level.find({ languageId: language._id });
  if (!allLevels.length) {
    return softDeleteLanguageById(language._id, options);
  }

  let moduleLevels = await Level.find({ languageId: language._id, ...buildModuleTypeFilter(moduleType) });
  moduleLevels = await filterLevelsForModule(moduleLevels, moduleType);
  const moduleLevelIds = new Set(moduleLevels.map((level) => String(level._id)));
  const otherLevels = allLevels.filter((level) => !moduleLevelIds.has(String(level._id)));

  if (!moduleLevels.length && otherLevels.length) {
    const types = new Set(otherLevels.map((level) => level.moduleType).filter(Boolean));
    if (types.size === 1) {
      language.moduleType = [...types][0];
      await language.save();
      return { retagged: true, moduleType: language.moduleType };
    }
    return { retagged: true, removedFromModule: true };
  }

  if (!otherLevels.length) {
    return softDeleteLanguageById(language._id, options);
  }

  return softDeleteLanguageForModule(language._id, moduleType, options);
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

function buildRecycleBinFilter(params = {}) {
  const { type, language, search, importantOnly } = params;
  const filter = { restoredAt: null, purgedAt: null };

  if (type && type !== 'all') {
    filter.$or = [{ displayType: type }, { collectionName: type }];
  }
  if (language && language !== 'all') {
    filter.languageName = language;
  }
  if (importantOnly === true || importantOnly === 'true') {
    filter.isImportant = true;
  }
  if (search && String(search).trim()) {
    filter.displayName = { $regex: String(search).trim(), $options: 'i' };
  }

  return filter;
}

async function toggleRecycleImportant(recycleBinId, options = {}) {
  const entry = await RecycleBin.findById(recycleBinId);
  if (!entry) {
    const error = new Error('Recycle bin entry not found');
    error.statusCode = 404;
    throw error;
  }
  if (entry.restoredAt || entry.purgedAt) {
    const error = new Error('This item cannot be marked as important');
    error.statusCode = 400;
    throw error;
  }

  if (typeof options.isImportant === 'boolean') {
    entry.isImportant = options.isImportant;
  } else {
    entry.isImportant = !entry.isImportant;
  }
  await entry.save();
  return entry;
}

async function purgeAllRecycleEntries(params = {}, options = {}) {
  const filter = buildRecycleBinFilter(params);
  const entries = await RecycleBin.find(filter).select('_id').lean();
  validateMassDelete(entries.length, options);

  const purged = [];
  for (const entry of entries) {
    purged.push(await purgeRecycleEntry(entry._id, options));
  }

  return { count: purged.length, purged };
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
  softDeleteLanguageForModule,
  resolveScopedLanguageDelete,
  softDeleteLessonsForLevelByType,
  softDeleteLessonsForLanguageByType,
  restoreRecycleEntry,
  purgeRecycleEntry,
  buildRecycleBinFilter,
  toggleRecycleImportant,
  purgeAllRecycleEntries,
  registerUpdateSnapshotHooks
};
