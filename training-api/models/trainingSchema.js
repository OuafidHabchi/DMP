// models/trainingSchema.js
const mongoose = require('mongoose');

const BreakSchema = new mongoose.Schema(
  {
    startAt: { type: String, required: true },
    endAt:   { type: String, required: true },
    _id:     { type: mongoose.Schema.Types.ObjectId, auto: true },
  },
  { _id: false }
);

// Un “jour” intégré dans Training
const DaySchema = new mongoose.Schema(
  {
    dayIndex: { type: Number, required: true }, // 1,2,3,...
    times: {
      startAt: { type: String},
      breaks:  { type: [BreakSchema], default: [] },
      endAt:   { type: String },
    },
    notes:    { type: String },
    result:   { type: String, enum: ['unset', 'pass', 'fail'], default: 'unset' },
  },
  { _id: true, timestamps: true }
);

// Document d’éligibilité ultra-simple
const TrainingDocSchema = new mongoose.Schema(
  {
    type:  { type: String, required: true }, // ex: "List A", "List B", "Work Permit", etc. (libre)
    title: { type: String, required: true }, // ex: "Passport", "SSN Card" (libre)
    url:   { type: String, required: true }, // lien Spaces (ou autre)
    _id:   { type: mongoose.Schema.Types.ObjectId, auto: true },
  },
  { _id: false }
);

const trainingSchema = new mongoose.Schema(
  {
    // Toujours sélection depuis le Hiring
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },

    // Snapshot pour affichage rapide
    fullName: { type: String, required: true },
    email:    { type: String },
    phone:    { type: String },
    // Documents (type, title, url seulement)
    documents: { type: [TrainingDocSchema], default: [] },

    // Jours intégrés
    days: { type: [DaySchema], default: [] },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  },
  { timestamps: true }
);

trainingSchema.index({ candidateId: 1, createdAt: -1 });

module.exports = trainingSchema;
