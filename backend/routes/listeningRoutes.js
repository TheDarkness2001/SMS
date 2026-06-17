const express = require('express');
const router = express.Router();
const listeningController = require('../controllers/listeningController');
const { upload, uploadAudioToImageKit } = require('../middleware/audioUpload');
const { protect } = require('../middleware/auth');

router.get('/random', protect, listeningController.getRandomExercise);
router.post('/check', protect, listeningController.checkAnswer);
router.get('/progress', protect, listeningController.getStudentProgress);
router.get('/leaderboard', protect, listeningController.getLeaderboard);
router.get('/students/group-progress', protect, listeningController.getGroupStudentProgress);
router.get('/exercises/:id/audio', listeningController.streamAudio);
router.get('/levels/:levelId/student-stats', protect, listeningController.getLevelStudentStats);
router.get('/lessons/:lessonId/student-stats', protect, listeningController.getLessonStudentStats);

router.get('/', protect, listeningController.getAllExercises);
router.post('/', protect, upload.single('audio'), uploadAudioToImageKit, listeningController.createExercise);
router.put('/:id', protect, upload.single('audio'), uploadAudioToImageKit, listeningController.updateExercise);
router.delete('/:id', protect, listeningController.deleteExercise);

module.exports = router;
