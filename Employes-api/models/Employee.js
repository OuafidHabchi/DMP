const mongoose = require('mongoose');

const employeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  familyName: { type: String, required: true },
  tel: { type: String, required: true },
  email: { type: String, required: true },
  flexAppEmail: { type: String },
  password: { type: String, required: true },
  role: { type: String, required: true },
  scoreCard: { type: String, required: true },
  focusArea: { type: String },
  Transporter_ID: { type: String },
  expoPushToken: { type: String },
  quiz: { type: Boolean },
  language: { type: String },
  dsp_code: { type: String },

  // Horaire fixe défini par le manager (l’employé ne peut pas le modifier)
  schedule: {
    monday: { type: Boolean, default: false },
    tuesday: { type: Boolean, default: false },
    wednesday: { type: Boolean, default: false },
    thursday: { type: Boolean, default: false },
    friday: { type: Boolean, default: false },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false },
    updatedAt: { type: Date, default: null }, // date de dernière mise à jour du schedule
    updatedBy: { type: String, default: null }, // managerId qui a mis à jour
  },
});

module.exports = employeSchema;
