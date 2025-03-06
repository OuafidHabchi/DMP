// /models/statusModel.js
const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  name: {type: String,required: true},
  color: {type: String,required: true},
  location: {type: String},
  
});

module.exports = statusSchema
