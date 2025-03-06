const mongoose = require('mongoose');
const { type } = require('os');

// Schéma de la collection DSP_code
const dspSchema = new mongoose.Schema({
  dsp_code: { type: String, required: true, unique: true },
  DataBase: { type: String, required: true },
  Access : { type : Boolean},
});

module.exports = mongoose.model('DSP_code', dspSchema, 'DSP_code');
