const mongoose = require('mongoose');

const dailyViolationSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  type: { type: String, required: true },
  link: { type: String },
  photo: { type: String },            // legacy (1 image) — conservé pour compat
  photos: [{ type: String }],         // ✅ NEW: multi-images
  description: { type: String },
  createdBy: { type: String, required: true },
  date: { type: String },
  seen: { type: Boolean, default: false },
});

// ✅ NEW: rétro-compat — si on a "photo" mais pas "photos", hydrate photos[0]
dailyViolationSchema.pre('save', function (next) {
  if ((!this.photos || this.photos.length === 0) && this.photo) {
    this.photos = [this.photo];
  }
  next();
});

module.exports = dailyViolationSchema;
