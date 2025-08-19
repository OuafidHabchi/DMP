const mongoose = require('mongoose');

const FieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['text'], default: 'text' },
  required: { type: Boolean, default: false },
  placeholder: { type: String }
}, { _id: false });

const StepSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  order: { type: Number, required: true },
  fields: [FieldSchema]
}, { _id: false });

const processSchema = new mongoose.Schema({
  steps: [StepSchema],               // Liste des étapes du processus
  ownerId: { type: String, required: true },
}, { timestamps: true });            // Ajoute createdAt et updatedAt automatiquement

module.exports = processSchema;
