import mongoose from 'mongoose';

const RateSchema = new mongoose.Schema({
  metal: { type: String, required: true, unique: true }, // 'gold', 'silver'
  base: { type: Number, default: 0 },
  offset: { type: Number, default: 0 }, 
  current: { type: Number, default: 0 }, // base + offset
  updatedAt: { type: Date, default: Date.now }
});

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // 'global_settings'
  ticker: { type: String, default: "Welcome to Abhinav Gold & Silver - Quality Purity Guaranteed" },
  marketStatus: {
    mode: { type: String, default: 'regular' },
    overrideStatus: { type: String, default: 'open' },
    openTime: { type: String, default: '10:00 AM' },
    closeTime: { type: String, default: '08:00 PM' }
  },
  stockOverrides: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

const VideoSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true },
  title: { type: String, default: 'Visual Content' },
  label: { type: String, default: 'New Addition' },
  createdAt: { type: Date, default: Date.now }
});

const AlertSchema = new mongoose.Schema({
  title: { type: String, required: true },
  msg: { type: String, required: true },
  type: { type: String, default: 'info' }, // 'urgent', 'info'
  date: { type: String, default: new Date().toLocaleDateString() },
  createdAt: { type: Date, default: Date.now }
});

export const Rate = mongoose.models.Rate || mongoose.model('Rate', RateSchema);
export const Setting = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);
export const Video = mongoose.models.Video || mongoose.model('Video', VideoSchema);
export const Alert = mongoose.models.Alert || mongoose.model('Alert', AlertSchema);
