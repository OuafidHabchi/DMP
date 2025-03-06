const mongoose = require('mongoose');
const { type } = require('os');

const phoneSchema = new mongoose.Schema({
    name: { type: String, required: true },
    number:{type: String, required: true},
    supplier:{type: String, required: true},
    model:{type: String, required: true},
    functional: { type: Boolean, default: true },
    comment:{type:String}
});

module.exports = phoneSchema
