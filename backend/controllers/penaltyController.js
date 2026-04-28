const Penalty = require('../models/Penalty');
const Student = require('../models/Student');

exports.createPenalty = async (req, res) => {
  try {
    const { studentId, type, points, quantity, date, lessonId, notes, branchId } = req.body;
    
    if (!studentId || !type || !points || !branchId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const penalty = await Penalty.create({
      studentId,
      type,
      points,
      quantity: quantity || 1,
      date: date || new Date(),
      lessonId: lessonId || null,
      notes: notes || '',
      source: 'manual',
      recordedBy: req.user?._id || null,
      branchId,
      isReverted: false
    });

    res.status(201).json({ success: true, data: penalty });
  } catch (error) {
    console.error('Error creating penalty:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStudentPenalties = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { year, month } = req.query;

    const query = { studentId, isReverted: false };
    if (year && month) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      query.date = { $gte: start, $lt: end };
    }

    const penalties = await Penalty.find(query)
      .sort({ date: -1 })
      .populate('recordedBy', 'name')
      .populate('lessonId', 'topic');

    const total = penalties.reduce((sum, p) => sum + (p.points * p.quantity), 0);

    res.json({ success: true, data: { penalties, total } });
  } catch (error) {
    console.error('Error fetching student penalties:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGroupPenalties = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { date } = req.query;

    const students = await Student.find({ group: groupId, status: 'active' }).select('_id name');
    const studentIds = students.map(s => s._id);

    const query = { studentId: { $in: studentIds }, isReverted: false };
    if (date) {
      const d = new Date(date);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }

    const penalties = await Penalty.find(query)
      .sort({ date: -1 })
      .populate('studentId', 'name');

    const byStudent = {};
    for (const s of students) {
      byStudent[s._id] = { student: s, penalties: [], total: 0 };
    }
    for (const p of penalties) {
      const sid = p.studentId?._id?.toString();
      if (byStudent[sid]) {
        byStudent[sid].penalties.push(p);
        byStudent[sid].total += p.points * p.quantity;
      }
    }

    res.json({ success: true, data: Object.values(byStudent) });
  } catch (error) {
    console.error('Error fetching group penalties:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMonthlyPenalties = async (req, res) => {
  try {
    const { year, month, branchId } = req.query;
    if (!year || !month || !branchId) {
      return res.status(400).json({ success: false, message: 'year, month, and branchId required' });
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const penalties = await Penalty.find({
      branchId,
      date: { $gte: start, $lt: end },
      isReverted: false
    }).populate('studentId', 'name');

    const total = penalties.reduce((sum, p) => sum + (p.points * p.quantity), 0);

    res.json({ success: true, data: { penalties, total } });
  } catch (error) {
    console.error('Error fetching monthly penalties:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.revertPenalty = async (req, res) => {
  try {
    const { id } = req.params;
    const penalty = await Penalty.findByIdAndUpdate(id, { isReverted: true }, { new: true });
    if (!penalty) {
      return res.status(404).json({ success: false, message: 'Penalty not found' });
    }
    res.json({ success: true, data: penalty });
  } catch (error) {
    console.error('Error reverting penalty:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
