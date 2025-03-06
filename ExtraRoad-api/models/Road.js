const mongoose = require('mongoose');

const RoadSchema = new mongoose.Schema({
    offerName: { type: String, required: true },
    roadNumber: { type: Number, required: true },
    startTime: { type: String, required: true },
    date: { type: String, required: true },
    seen: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    interested: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    notInterested: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    valid: { type: Boolean, default: true }
});

module.exports = RoadSchema; // Export uniquement le schéma
