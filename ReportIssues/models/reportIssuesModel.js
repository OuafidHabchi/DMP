// models/reportIssuesModel.js
const mongoose = require('mongoose');

const reportIssueSchema = new mongoose.Schema({
  vanId: {type: String,required: true},
  statusId: {type: String,required: true},
  drivable: {type: Boolean,required: true},
  note: {type: String}
});


module.exports = reportIssueSchema;
