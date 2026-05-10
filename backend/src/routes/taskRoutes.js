import { Router } from 'express';
import mongoose from 'mongoose';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { authRequired, attachUser, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(authRequired, attachUser);

router.get('/stats/quality', requireRole('Admin'), async (req, res, next) => {
  try {
    const [rejectedAgg, ahtAgg] = await Promise.all([
      Task.countDocuments({ $or: [{ status: 'rejected' }, { status: 'Rejected' }] }),
      Task.aggregate([
        {
          $match: {
            actualTimeSpent: { $gt: 0 },
            status: { $in: ['submitted', 'approved', 'rejected', 'Submitted', 'Approved', 'Rejected'] },
          },
        },
        {
          $group: {
            _id: null,
            averageHandleTimeSeconds: { $avg: '$actualTimeSpent' },
            sampleCount: { $sum: 1 },
          },
        },
      ]),
    ]);

    const ahtRow = ahtAgg[0];
    res.json({
      rejectedCount: rejectedAgg,
      averageHandleTimeSeconds: ahtRow ? Math.round(ahtRow.averageHandleTimeSeconds * 100) / 100 : 0,
      tasksWithTimeRecorded: ahtRow ? ahtRow.sampleCount : 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/progress/today', async (req, res, next) => {
  try {
    if (String(req.user.role || '').toLowerCase() !== 'member') {
      return res.status(403).json({ message: 'Only members can access daily progress' });
    }
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const [submittedToday, assignedTotal] = await Promise.all([
      Task.countDocuments({
        assignedTo: req.user._id,
        submittedAt: { $gte: start, $lt: end },
      }),
      Task.countDocuments({
        assignedTo: req.user._id,
      }),
    ]);

    res.json({
      submittedToday,
      assignedTotal,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'Member') {
      query.assignedTo = req.user._id;
    }
    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

router.post('/bulk', requireRole('Admin'), async (req, res, next) => {
  try {
    const { userIds, taskTemplate, count } = req.body;
    const perMemberCount = Number(count);
    const title = taskTemplate?.title?.trim?.() || '';
    const description = taskTemplate?.description ?? '';
    const minTimeRequired = Number(taskTemplate?.minTimeRequired);

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'userIds must be a non-empty array' });
    }
    if (!title) {
      return res.status(400).json({ message: 'taskTemplate.title is required' });
    }
    if (Number.isNaN(minTimeRequired) || minTimeRequired < 0) {
      return res.status(400).json({ message: 'taskTemplate.minTimeRequired must be non-negative' });
    }
    if (!Number.isInteger(perMemberCount) || perMemberCount <= 0) {
      return res.status(400).json({ message: 'count must be a positive integer' });
    }

    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: 'All userIds must be valid ids' });
    }

    const users = await User.find({ _id: { $in: uniqueUserIds } }, '_id role');
    if (users.length !== uniqueUserIds.length) {
      return res.status(400).json({ message: 'One or more users were not found' });
    }

    const docs = [];
    for (const userId of uniqueUserIds) {
      for (let i = 0; i < perMemberCount; i += 1) {
        docs.push({
          title,
          description,
          assignedTo: userId,
          minTimeRequired,
          status: 'pending',
        });
      }
    }

    const created = await Task.insertMany(docs);
    res.status(201).json({
      createdCount: created.length,
      selectedUsers: uniqueUserIds.length,
      tasksPerMember: perMemberCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }
    const task = await Task.findById(id).populate('assignedTo', 'name email');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (req.user.role === 'Member' && task.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not assigned to this task' });
    }
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRole('Admin'), async (req, res, next) => {
  try {
    const { title, description, assignedTo, status, minTimeRequired, actualTimeSpent } = req.body;
    const normalizedStatus = status ? String(status).toLowerCase() : 'pending';
    if (!title || minTimeRequired == null || !assignedTo) {
      return res.status(400).json({ message: 'title, minTimeRequired, and assignedTo are required' });
    }
    if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
      return res.status(400).json({ message: 'assignedTo must be a valid user id' });
    }
    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      return res.status(400).json({ message: 'Assignee not found' });
    }
    const task = await Task.create({
      title,
      description: description ?? '',
      assignedTo,
      status: normalizedStatus,
      minTimeRequired: Number(minTimeRequired),
      actualTimeSpent: actualTimeSpent != null ? Number(actualTimeSpent) : 0,
    });
    const populated = await Task.findById(task._id).populate('assignedTo', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireRole('Admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }
    const updates = {};
    const allowed = [
      'title',
      'description',
      'assignedTo',
      'status',
      'minTimeRequired',
      'actualTimeSpent',
      'proofOfWork',
      'adminFeedback',
    ];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    const task = await Task.findByIdAndUpdate(id, updates, { new: true }).populate(
      'assignedTo',
      'name email'
    );
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }
    const { actualTimeSpent, proofOfWork } = req.body;
    if (actualTimeSpent == null || Number.isNaN(Number(actualTimeSpent))) {
      return res.status(400).json({ message: 'actualTimeSpent is required (seconds)' });
    }
    const seconds = Number(actualTimeSpent);
    if (seconds < 0) {
      return res.status(400).json({ message: 'actualTimeSpent must be non-negative' });
    }
    if (!proofOfWork || typeof proofOfWork !== 'string' || !proofOfWork.trim()) {
      return res.status(400).json({ message: 'proofOfWork is required' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the assignee can submit this task' });
    }
    const currentStatus = String(task.status || '').toLowerCase();
    if (currentStatus !== 'pending') {
      return res.status(400).json({ message: 'Only pending tasks can be submitted' });
    }

    if (seconds < task.minTimeRequired) {
      return res.status(400).json({
        message: `Submission requires at least ${task.minTimeRequired}s recorded (got ${seconds}s)`,
        code: 'INSUFFICIENT_TIME',
        minTimeRequired: task.minTimeRequired,
        actualTimeSpent: seconds,
      });
    }

    task.actualTimeSpent = seconds;
    task.proofOfWork = proofOfWork.trim();
    task.adminFeedback = '';
    task.submittedAt = new Date();
    task.status = 'submitted';
    await task.save();

    const populated = await Task.findById(task._id).populate('assignedTo', 'name email');
    res.json(populated);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/review', requireRole('Admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid task id' });
    }
    const { decision, feedback } = req.body;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ message: "decision must be either 'approve' or 'reject'" });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    const currentStatus = String(task.status || '').toLowerCase();
    if (currentStatus !== 'submitted') {
      return res.status(400).json({ message: 'Only submitted tasks can be reviewed' });
    }
    if (decision === 'reject' && (!feedback || !String(feedback).trim())) {
      return res.status(400).json({ message: 'Feedback is required when rejecting a task' });
    }

    task.status = decision === 'approve' ? 'approved' : 'rejected';
    task.adminFeedback = decision === 'reject' ? String(feedback).trim() : '';
    await task.save();

    const populated = await Task.findById(task._id).populate('assignedTo', 'name email');
    res.json(populated);
  } catch (err) {
    next(err);
  }
});

export default router;
