const PresentationScore = require('../models/PresentationScore');
const Student = require('../models/Student');

exports.recordPresentation = async (req, res) => {
  try {
    const { studentId, score, date, lessonId, notes, branchId } = req.body;
    
    if (!studentId || !score || !branchId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const presentation = await PresentationScore.create({
      studentId,
      score,
      date: date || new Date(),
      lessonId: lessonId || null,
      notes: notes || '',
      evaluatedBy: req.user?._id || null,
      branchId
    });

    res.status(201).json({ success: true, data: presentation });
  } catch (error) {
    console.error('Error recording presentation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentPresentations = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { year, month } = req.query;

    const query = { studentId };
    if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      query.date = { $gte: start, $lt: end };
    }

    const presentations = await PresentationScore.find(query)
      .sort({ date: -1 })
      .populate('evaluatedBy', 'name');

    const avgScore = presentations.length > 0
      ? (presentations.reduce((sum, p) => sum + p.score, 0) / presentations.length).toFixed(1)
      : 0;

    res.json({ success: true, data: { presentations, avgScore, count: presentations.length } });
  } catch (error) {
    console.error('Error fetching student presentations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMonthlyPresentations = async (req, res) => {
  try {
    const { year, month, branchId } = req.query;
    if (!year || !month || !branchId) {
      return res.status(400).json({ success: false, message: 'year, month, and branchId required' });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const presentations = await PresentationScore.find({
      branchId,
      date: { $gte: start, $lt: end }
    }).populate('studentId', 'name');

    const byStudent = {};
    for (const p of presentations) {
      const sid = p.studentId?._id?.toString();
      if (!byStudent[sid]) {
        byStudent[sid] = { student: p.studentId, scores: [], total: 0 };
      }
      byStudent[sid].scores.push(p);
      byStudent[sid].total += p.score;
    }

    const summary = Object.values(byStudent).map(s => ({
      student: s.student,
      count: s.scores.length,
      average: (s.total / s.scores.length).toFixed(1),
      scores: s.scores
    }));

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching monthly presentations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopPresenters = async (req, res) => {
  try {
    const { year, month, branchId, limit = 10 } = req.query;
    if (!year || !month || !branchId) {
      return res.status(400).json({ success: false, message: 'year, month, and branchId required' });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const topPresenters = await PresentationScore.aggregate([
      { $match: { branchId: new mongoose.Types.ObjectId(branchId), date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: '$studentId',
          avgScore: { $avg: '$score' },
          count: { $sum: 1 },
          totalScore: { $sum: '$score' }
        }
      },
      { $sort: { avgScore: -1, count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    await Student.populate(topPresenters, { path: '_id', select: 'name' });

    res.json({ success: true, data: topPresenters });
  } catch (error) {
    console.error('Error fetching top presenters:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
