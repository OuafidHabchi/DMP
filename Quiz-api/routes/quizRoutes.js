// quizRoutes.js
const express = require('express');
const dbMiddleware = require('../../utils/middleware');
const quizController = require('../controllers/quizController');
const router = express.Router();

router.use((req, res, next) => {
  req.requiredModels = ['Quiz', 'QuizAssignment','Employee'];
  next();
});

router.use(dbMiddleware);

router.post('/create', quizController.createQuiz);
router.get('/', quizController.getAllQuizzes);
router.get('/:id', quizController.getQuizById);
router.put('/:id', quizController.updateQuiz);
router.delete('/:id', quizController.deleteQuiz);
router.post('/assign', quizController.assignQuizToEmployee);
router.post('/submit', quizController.submitQuiz);
// Route pour récupérer les employés assignés à un quiz
router.get('/:quizId/assigned-employees', quizController.getAssignedEmployees);
// Route pour récupérer les quiz d'un employé
router.get('/employee/:employeeId', quizController.getQuizzesByEmployeeId);
// Route pour soumettre les résultats d'un quiz
router.post('/result/submit', quizController.submitQuizResults);

router.get('/answers/:quizId/employee/:employeeId/answers', quizController.getEmployeeQuizAnswers);
// Route pour supprimer une assignation
router.delete('/assignments/:assignmentId', quizController.deleteAssignment);





module.exports = router;
