// src/models/RequestAccess.js
const mongoose = require('mongoose');

const RequestAccessSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Assure que l'email est unique
  },
  dspName: {
    type: String,
    required: true,
  },
  dspShortCode: {
    type: String,
    required: function () {
      return this.heardAboutUs === 'Referred by DSP'; // Conditionnellement requis
    },
  },
  stationCode: {
    type: String,
    required: true,
  },
  stationAddress: {
    type: String,
    required: true,
  },
  heardAboutUs: {
    type: String,
    required: true,
  },
  heardAboutUsDSP: {
    type: String,
    required: function () {
      return this.heardAboutUs === 'Referred by DSP'; // Conditionnellement requis
    },
  },
}, { timestamps: true }); // Ajoute automatiquement `createdAt` et `updatedAt`

module.exports = RequestAccessSchema; // Exportez le schéma (PAS un modèle)
