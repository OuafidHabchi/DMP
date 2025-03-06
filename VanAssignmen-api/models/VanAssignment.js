// models/VanAssignment.js
const mongoose = require('mongoose');
const { type } = require('os');

const VanAssignmentSchema =new mongoose.Schema({
    employeeId: {
        type: String,  // Simplement un type String sans ref
        required: true
    },
    vanId: {
        type: String,  // Simplement un type String sans ref
        required: true
    },
    date: {
        type: String,
        required: true
    },
    statusId :{type:String}
});

module.exports = VanAssignmentSchema;
