const mongoose = require('mongoose');

// Modèle QuizAssignment pour gérer les attributions de quiz
const quizAssignmentSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
    score: { type: Number, default: 0 },
    answers: [
        {
            questionText: { type: String, required: true },
            selectedOption: { type: String, required: true },
            correctAnswer: { type: String, required: true },
            isCorrect: { type: Boolean, required: true }
        }
    ],
    createdAt: { type: Date, default: Date.now }
});

module.exports = quizAssignmentSchema;
