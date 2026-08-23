import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  categories: { type: [String], default: [] },
  priorities: { type: [String], default: [] }
}, { strict: false });

export const SystemConfig = mongoose.models.SystemConfig || mongoose.model('SystemConfig', systemConfigSchema);
