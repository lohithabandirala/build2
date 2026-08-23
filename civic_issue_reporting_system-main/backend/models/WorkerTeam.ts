import mongoose from 'mongoose';

const workerTeamSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  name: { type: String },
  members: { type: [String], default: [] },
  activeTasks: { type: Number, default: 0 }
});

export const WorkerTeam = mongoose.models.WorkerTeam || mongoose.model('WorkerTeam', workerTeamSchema);
