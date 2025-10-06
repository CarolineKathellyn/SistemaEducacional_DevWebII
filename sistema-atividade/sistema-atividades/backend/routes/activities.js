const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateToken, requireProfessor, requireAluno } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Rotas públicas autenticadas
router.get('/', authenticateToken, activityController.getActivities);
router.get('/:id', authenticateToken, activityController.getActivityById);

// Rotas de professor
router.post('/', authenticateToken, requireProfessor, activityController.createActivity);
router.put('/:id', authenticateToken, requireProfessor, activityController.updateActivity);
router.delete('/:id', authenticateToken, requireProfessor, activityController.deleteActivity);
router.get('/:id/submissions', authenticateToken, requireProfessor, activityController.getSubmissions);

// Rotas de aluno
router.post('/submit', authenticateToken, requireAluno, upload.single('arquivo'), activityController.submitActivity);

module.exports = router;