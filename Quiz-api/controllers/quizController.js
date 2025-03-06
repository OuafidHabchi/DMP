// quizController.js
const { sendPushNotification } = require('../../utils/notifications');



exports.createQuiz = async (req, res) => {
    try {
        const Quiz = req.connection.models.Quiz;
        const { title, createdBy, questions } = req.body;
        // Validation basique
        if (!title || !createdBy || !questions || questions.length === 0) {
            return res.status(500).json({ message: 'All fields are required: title, createdBy, questions' });
        }

        const quiz = new Quiz({ title, createdBy, questions });
        await quiz.save();
        res.status(200).json(quiz);
    } catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({ message: 'Error creating quiz', error });
    }
};


exports.getAllQuizzes = async (req, res) => {
    try {
        const Quiz = req.connection.models.Quiz;
        const Employee = req.connection.models.Employee;

        // 🚀 Jointure avec Employee pour obtenir les détails du créateur
        const quizzes = await Quiz.find().populate({
            path: 'createdBy',
            model: Employee,
            select: 'name familyName'
        });

        // 🚀 Construction de la réponse avec les détails du créateur
        const quizzesWithCreator = quizzes.map(quiz => ({
            _id: quiz._id,
            title: quiz.title,
            createdBy: quiz.createdBy ? {
                _id: quiz.createdBy._id,
                name: quiz.createdBy.name ?? 'Inconnu',
                familyName: quiz.createdBy.familyName ?? 'Inconnu'
            } : null,
            createdAt: quiz.createdAt,
            questions: quiz.questions,
        }));

        res.status(200).json(quizzesWithCreator);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des quizzes', error });
    }
};


exports.getQuizById = async (req, res) => {
    try {
        const Quiz = req.connection.models.Quiz;
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(500).json({ message: 'Quiz not found' });
        }
        res.status(200).json(quiz);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching quiz', error });
    }
};

exports.updateQuiz = async (req, res) => {
    try {
        const Quiz = req.connection.models.Quiz;
        const { title, questions } = req.body;

        const updatedQuiz = await Quiz.findByIdAndUpdate(req.params.id, { title, questions }, { new: true });
        if (!updatedQuiz) {
            return res.status(500).json({ message: 'Quiz not found' });
        }
        res.status(200).json(updatedQuiz);
    } catch (error) {
        res.status(500).json({ message: 'Error updating quiz', error });
    }
};

exports.deleteQuiz = async (req, res) => {
    try {
        const Quiz = req.connection.models.Quiz;
        const Assignment = req.connection.models.QuizAssignment;

        // Supprimer le quiz
        const deletedQuiz = await Quiz.findByIdAndDelete(req.params.id);
        if (!deletedQuiz) {
            return res.status(500).json({ message: 'Quiz not found' });
        }

        // Supprimer toutes les assignations associées à ce quiz
        await Assignment.deleteMany({ quizId: req.params.id });

        res.status(200).json({ message: 'Quiz and associated assignments deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting quiz and associated assignments', error });
    }
};

exports.assignQuizToEmployee = async (req, res) => {
    try {
        const { quizId, employeeId } = req.body;
        const Assignment = req.connection.models.QuizAssignment;
        const Employee = req.connection.models.Employee;
        const Quiz = req.connection.models.Quiz;

        // Vérifier l'existence du quiz
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(500).json({ message: 'Quiz not found' });
        }

        // Créer l'assignation
        const assignment = new Assignment({
            quizId,
            employeeId,
            status: 'pending'
        });
        await assignment.save();

        // Récupérer l'employé assigné
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(500).json({ message: 'Employee not found' });
        }

        // Envoi de la notification push si l'employé a un token valide
        if (employee.expoPushToken) {
            try {
                await sendPushNotification(
                    employee.expoPushToken,
                    `You have been assigned a new quiz: '${quiz.title}'. Check it out and submit your answers!`
                );
            } catch (error) {
            }
        } else {
        }

        res.status(200).json({
            message: 'Quiz assigned successfully and notification sent',
            assignment
        });

    } catch (error) {
        res.status(500).json({ message: 'Error assigning quiz', error });
    }
};

exports.submitQuiz = async (req, res) => {
    try {
        const { assignmentId, answers } = req.body;
        const Assignment = req.connection.models.QuizAssignment;

        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(500).json({ message: 'Assignment not found' });
        }

        // Calculer le score
        const Quiz = req.connection.models.Quiz;
        const quiz = await Quiz.findById(assignment.quizId);

        let score = 0;
        quiz.questions.forEach((question, index) => {
            if (answers[index]?.selectedOption === question.correctAnswer) {
                score++;
            }
        });

        const percentage = (score / quiz.questions.length) * 100;

        assignment.status = 'completed';
        assignment.answers = answers;
        assignment.score = percentage;
        await assignment.save();

        res.status(200).json({ message: 'Quiz submitted successfully', score: percentage });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting quiz', error });
    }
};


// 🚀 Récupérer les employés assignés à un quiz
exports.getAssignedEmployees = async (req, res) => {
    try {
        const { quizId } = req.params;
        const Assignment = req.connection.models.QuizAssignment;

        // Rechercher les assignations associées à ce quiz et peupler les employés
        const assignments = await Assignment.find({ quizId }).populate('employeeId');

        // Construire une liste avec les détails des employés ET l'ID d'assignation
        const employeesWithAssignments = assignments.map(assignment => ({
            _id: assignment.employeeId._id,
            name: assignment.employeeId.name,
            familyName: assignment.employeeId.familyName,
            score: assignment.score,
            assignmentId: assignment._id , // ✅ Ajout correct de assignmentId
            status:assignment.status
        }));

        res.status(200).json(employeesWithAssignments);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des employés assignés', error });
    }
};



// 🚀 Récupérer tous les quiz assignés à un employé donné
exports.getQuizzesByEmployeeId = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const Assignment = req.connection.models.QuizAssignment;
        const Quiz = req.connection.models.Quiz;

        // Rechercher les assignations pour l'employé donné
        const assignments = await Assignment.find({ employeeId });

        // Renvoyer une liste vide si aucune assignation n'est trouvée
        if (!assignments.length) {
            return res.status(200).json([]);
        }

        // Récupérer les détails des quiz associés
        const quizIds = assignments.map((assignment) => assignment.quizId);
        const quizzes = await Quiz.find({ _id: { $in: quizIds } });

        // Enrichir les données avec les statuts, scores et l'ID de l'assignation
        const enrichedQuizzes = quizzes.map((quiz) => {
            const assignment = assignments.find((a) => a.quizId.toString() === quiz._id.toString());
            return {
                ...quiz.toObject(),
                assignmentId: assignment?._id, // ✅ Ajout de l'ID de l'assignation
                status: assignment?.status,
                score: assignment?.score,
            };
        });

        res.status(200).json(enrichedQuizzes);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des quiz assignés', error });
    }
};



exports.submitQuizResults = async (req, res) => {
    try {
        const { assignmentId, answers, score } = req.body;
        const Assignment = req.connection.models.QuizAssignment;
        const Quiz = req.connection.models.Quiz;
        // Vérifier l'existence de l'assignation
        const assignment = await Assignment.findById(assignmentId);
        // Récupérer le quiz associé
        const quiz = await Quiz.findById(assignment.quizId);
        // Vérifier et préparer les résultats
        const results = answers.map((answer) => {
            const correspondingQuestion = quiz.questions.find(q =>
                q.questionText.trim().toLowerCase() === answer.questionText.trim().toLowerCase()
            );

            if (!correspondingQuestion) {
                return {
                    questionText: answer.questionText,
                    selectedOption: answer.selectedOption,
                    correctAnswer: '❓ Question not found',
                    isCorrect: false
                };
            }

            const correctAnswerText = correspondingQuestion.correctAnswer;
            const isCorrect = answer.selectedOption === correctAnswerText;

            return {
                questionText: correspondingQuestion.questionText,
                selectedOption: answer.selectedOption,
                correctAnswer: correctAnswerText,
                isCorrect
            };
        });

        // Mettre à jour l'assignation avec les résultats et le score fourni
        assignment.status = 'completed';
        assignment.answers = results;
        assignment.score = parseFloat(score); // Utilise directement le score reçu du frontend
        await assignment.save();

        res.status(200).json({
            message: '✅ Quiz results submitted successfully',
            score: score, // Renvoyer le score tel qu'il a été reçu
            details: results
        });

    } catch (error) {
        res.status(500).json({ message: '⚠️ Error submitting quiz results', error });
    }
};


// 🚀 Récupérer les réponses d'un employé pour un quiz donné
exports.getEmployeeQuizAnswers = async (req, res) => {
    try {
        const { quizId, employeeId } = req.params;
        const Assignment = req.connection.models.QuizAssignment;
        const Quiz = req.connection.models.Quiz;

        // Trouver l'assignation spécifique
        const assignment = await Assignment.findOne({ quizId, employeeId });
        if (!assignment) {
            return res.status(500).json({ message: "Aucune assignation trouvée pour cet employé et ce quiz." });
        }

        // Récupérer le quiz pour obtenir les questions
        const quiz = await Quiz.findById(quizId);
        if (!quiz) {
            return res.status(500).json({ message: "Quiz non trouvé." });
        }

        // Associer les réponses fournies par l'employé avec les questions et les bonnes réponses
        const detailedAnswers = quiz.questions.map((question) => {
            const userAnswer = assignment.answers.find((ans) => ans.questionText === question.questionText);
            return {
                question: question.questionText,
                userAnswer: userAnswer ? userAnswer.selectedOption : "Pas de réponse",
                correctAnswer: question.correctAnswer,
                isCorrect: userAnswer ? userAnswer.selectedOption === question.correctAnswer : false,
            };
        });

        res.status(200).json(detailedAnswers);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des réponses d'un employé", error });
    }
};

// 🚀 Supprimer une assignation par ID
exports.deleteAssignment = async (req, res) => {
    try {
        const { assignmentId } = req.params;

        // 🚨 Vérification préliminaire
        if (!assignmentId || assignmentId === 'undefined') {
            return res.status(500).json({ message: 'ID de l’assignation invalide.' });
        }

        const Assignment = req.connection.models.QuizAssignment;

        // Trouver et supprimer l'assignation
        const deletedAssignment = await Assignment.findByIdAndDelete(assignmentId);

        if (!deletedAssignment) {
            return res.status(500).json({ message: 'Aucune assignation trouvée avec cet ID.' });
        }

        res.status(200).json({
            message: 'Assignation supprimée avec succès.',
            deletedAssignment
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la suppression de l\'assignation', error });
    }
};
