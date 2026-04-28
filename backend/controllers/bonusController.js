const Penalty = require('../models/Penalty');
const PresentationScore = require('../models/PresentationScore');
const PenaltyPeriod = require('../models/PenaltyPeriod');
const Student = require('../models/Student');
const mongoose = require('mongoose');

exports.calculateMonthlyBonuses = async (req, res) => {
  try {
    const { year, month, branchId } = req.query;
    if (!year || !month || !branchId) {
      return res.status(400).json({ success: false, message: 'year, month, and branchId required' });
    }

    const y = parseInt(year);
    const m = parseInt(month);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    // Get total penalties
    const penalties = await Penalty.find({
      branchId,
      date: { $gte: start, $lt: end },
      isReverted: false,
      type: { $ne: 'bonus' }
    });
    const totalPenalties = Math.abs(penalties.reduce((sum, p) => sum + (p.points * p.quantity), 0));

    // Get top presenters
    const presenterStats = await PresentationScore.aggregate([
      { $match: { branchId: new mongoose.Types.ObjectId(branchId), date: { $gte: start, $lt: end } } },
      {
        $group: {
          _id: '$studentId',
          avgScore: { $avg: '$score' },
          count: { $sum: 1 }
        }
      },
      { $sort: { avgScore: -1, count: -1 } },
      { $limit: 5 }
    ]);

    await Student.populate(presenterStats, { path: '_id', select: 'name' });

    const distribution = {
      totalPenalties,
      firstPlace: { percentage: 40, amount: Math.round(totalPenalties * 0.4) },
      secondPlace: { percentage: 30, amount: Math.round(totalPenalties * 0.3) },
      educationCenter: { percentage: 30, amount: Math.round(totalPenalties * 0.3) },
      topPresenters: presenterStats.map((p, i) => ({
        rank: i + 1,
        student: p._id,
        avgScore: p.avgScore.toFixed(1),
        count: p.count
      }))
    };

    res.json({ success: true, data: distribution });
  } catch (error) {
    console.error('Error calculating bonuses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.distributeBonuses = async (req, res) => {
  try {
    const { year, month, branchId, firstPlaceStudentId, secondPlaceStudentId } = req.body;
    if (!year || !month || !branchId || !firstPlaceStudentId || !secondPlaceStudentId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const y = parseInt(year);
    const m = parseInt(month);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);

    // Get total penalties
    const penalties = await Penalty.find({
      branchId,
      date: { $gte: start, $lt: end },
      isReverted: false,
      type: { $ne: 'bonus' }
    });
    const totalPenalties = Math.abs(penalties.reduce((sum, p) => sum + (p.points * p.quantity), 0));

    const firstAmount = Math.round(totalPenalties * 0.4);
    const secondAmount = Math.round(totalPenalties * 0.3);

    // Create bonus penalty records (positive points)
    await Penalty.create([
      {
        studentId: firstPlaceStudentId,
        type: 'bonus',
        points: firstAmount,
        quantity: 1,
        date: new Date(),
        notes: `1st place bonus for ${y}-${m}`,
        source: 'auto',
        branchId,
        isReverted: false
      },
      {
        studentId: secondPlaceStudentId,
        type: 'bonus',
        points: secondAmount,
        quantity: 1,
        date: new Date(),
        notes: `2nd place bonus for ${y}-${m}`,
        source: 'auto',
        branchId,
        isReverted: false
      }
    ]);

    // Close the period
    const period = await PenaltyPeriod.findOneAndUpdate(
      { year: y, month: m, branchId },
      {
        totalPenalties,
        totalBonusesDistributed: firstAmount + secondAmount,
        status: 'closed',
        winners: [
          { studentId: firstPlaceStudentId, rank: 1, percentage: 40, amount: firstAmount },
          { studentId: secondPlaceStudentId, rank: 2, percentage: 30, amount: secondAmount }
        ]
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: period });
  } catch (error) {
    console.error('Error distributing bonuses:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBonusHistory = async (req, res) => {
  try {
    const { branchId } = req.query;
    const query = branchId ? { branchId } : {};
    const periods = await PenaltyPeriod.find(query)
      .sort({ year: -1, month: -1 })
      .populate('winners.studentId', 'name');
    res.json({ success: true, data: periods });
  } catch (error) {
    console.error('Error fetching bonus history:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
