import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    proofOfWork: { type: String, default: '' },
    adminFeedback: { type: String, default: '' },
    submittedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'approved', 'rejected'],
      default: 'pending',
    },
    minTimeRequired: { type: Number, required: true, min: 0 },
    actualTimeSpent: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Task = mongoose.model('Task', taskSchema);
