const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

// Models
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Subject = require('./models/Subject');
const ExamGroup = require('./models/ExamGroup');
const Language = require('./models/Language');
const Level = require('./models/Level');
const Lesson = require('./models/Lesson');
const Sentence = require('./models/Sentence');

async function seed() {
  const mongod = await MongoMemoryServer.create({ instance: { port: 27018 } });
  const uri = mongod.getUri();
  console.log('In-memory MongoDB running at:', uri);

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

  // Create teacher
  const teacher = await Teacher.create({
    name: 'Test Teacher',
    email: 'teacher@test.com',
    password: 'teacher123',
    phone: '+1234567890',
    subject: ['English'],
    department: 'Arts',
    role: 'teacher',
    status: 'active'
  });

  // Create student
  const student = await Student.create({
    studentId: 'STU001',
    name: 'Emily Davis',
    email: 'emily.davis@student.com',
    password: 'student123',
    phone: '+1234567801',
    dateOfBirth: new Date('2008-05-15'),
    gender: 'female',
    address: '123 Main St',
    parentName: 'Robert Davis',
    parentPhone: '+1234567811',
    status: 'active',
    subjects: ['English']
  });

  // Create subject
  const subject = await Subject.create({
    name: 'English',
    code: 'ENG',
    description: 'English language'
  });

  // Create exam group
  const examGroup = await ExamGroup.create({
    groupName: 'Group A',
    subject: subject._id,
    subjectName: 'English',
    class: '10',
    section: 'A',
    students: [student._id],
    teachers: [teacher._id]
  });

  // Create language
  const language = await Language.create({
    name: 'English'
  });

  // Create level
  const level = await Level.create({
    name: 'Blackhole 1',
    languageId: language._id,
    practiceUnlockedFor: [examGroup._id]
  });

  // Create lesson
  const lesson = await Lesson.create({
    name: 'Lesson 1',
    levelId: level._id,
    order: 1
  });

  // Create sentences
  const sentences = await Sentence.create([
    {
      english: 'The cat sits on the mat.',
      uzbek: 'Mushiq gilam ustida o\'tiradi.',
      lessonId: lesson._id
    },
    {
      english: 'I like to eat apples.',
      uzbek: 'Men olma yemoqchi man.',
      lessonId: lesson._id
    },
    {
      english: 'She is going to school.',
      uzbek: 'U maktabga ketyapti.',
      lessonId: lesson._id
    },
    {
      english: 'We have a big house.',
      uzbek: 'Bizda katta uy bor.',
      lessonId: lesson._id
    },
    {
      english: 'He plays football every day.',
      uzbek: 'U har kuni futbol o\'ynaydi.',
      lessonId: lesson._id
    }
  ]);

  console.log('Seeded:');
  console.log('  Teacher:', teacher.email);
  console.log('  Student:', student.email, '/ password: student123');
  console.log('  Language:', language.name);
  console.log('  Level:', level.name);
  console.log('  Lesson:', lesson.name);
  console.log('  Sentences:', sentences.length);
  console.log('\nMongoDB URI for backend:');
  console.log(uri);
  console.log('\nKeep this terminal running. Press Ctrl+C to stop...');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
