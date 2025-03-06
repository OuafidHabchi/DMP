const mongoose = require('mongoose');

const powerBankSchema = new mongoose.Schema({
    name: { type: String, required: true },
    functional: { type: Boolean, default: true },
    comment:{type:String}
});

module.exports = powerBankSchema;
