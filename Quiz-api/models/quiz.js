const mongoose = require('mongoose');

// Nouveau modèle de Quiz avec questions et réponses
const quizSchema = new mongoose.Schema({
    title: { type: String, required: true },
    createdBy: { type: String, required: true }, // ID du manager
    questions: [
        {
            questionText: { type: String, required: true },
            options: [{ type: String, required: true }],
            correctAnswer: { type: String, required: true },
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = quizSchema;