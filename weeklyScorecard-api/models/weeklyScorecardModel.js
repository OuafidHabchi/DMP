// models/weeklyScorecardModel.js
const mongoose = require('mongoose');

const TopIssueSchema = new mongoose.Schema(
  {
    metric: { type: String, required: true }, // ex: "Seatbelt", "Speeding", "DCR"
    tier: { type: String },                   // ex: "Bronze", "Silver", "Gold", "Platinum"
    score: { type: Number }                   // ex: 58
  },
  { _id: false }
);

const weeklyScorecardSchema = new mongoose.Schema(
  {
    // Référence à l’employé
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },

    // Semaine
    weekId: { type: String, required: true, index: true },     // ex: "2025-W38"
    weekStartDate: { type: Date, index: true },                // lundi de la semaine

    // Résumé performance
    overallStanding: { type: String }, // Platinum / Gold / Silver / Bronze
    overallScore: { type: Number },
    packagesDelivered: { type: Number },

    // Points à améliorer
    topIssues: { type: [TopIssueSchema], default: [] },

    // Flags et tendances
    isCritical: { type: Boolean, default: false },   // sécurité en Bronze ?
    trendOverallScore: { type: Number, default: 0 }, // diff vs semaine N-1

    // Métadonnées
    importSource: { type: String } // nom du fichier / user
  },
  { timestamps: true }
);

// Contrainte d’unicité : un employé ne peut avoir qu’un scorecard par semaine
weeklyScorecardSchema.index({ employeeId: 1, weekId: 1 }, { unique: true });

module.exports = weeklyScorecardSchema;
