const mongoose = require("mongoose");

const IdentitySchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  personalEmail: String,
  phone: String,
  notes: String
}, { _id: false });

const HistorySchema = new mongoose.Schema({
  fromStepId: { type: String, default: null },
  toStepId: { type: String, default: null },
  at: { type: Date, default: Date.now },
  by: { type: String, required: true }
}, { _id: false });

const candidateSchema = new mongoose.Schema({
  identity: IdentitySchema,
  currentStepId: { type: String, default: null },
  stepData: { type: Object, default: {} },
  history: [HistorySchema],
  createdBy: { type: String, required: true }
}, { timestamps: true });

module.exports = candidateSchema;
