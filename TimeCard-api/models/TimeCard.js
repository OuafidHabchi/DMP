const mongoose = require('mongoose');
const { type } = require('os');

const timeCardSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
  },
  day: {
    type: String,
    required: true,
  },
  startTime: {
    type: String,
    
  },
  endTime: {
    type: String,
    
  },
  tel:{
    type: String,
  },
  powerbank:{
    type: String,
  },
  lastDelivery:{
    type: String,
  },
  CortexDuree:{
    type: String,
  },
  CortexEndTime:{
    type: String,
  },
 image:{type:String},
});


module.exports = timeCardSchema;
