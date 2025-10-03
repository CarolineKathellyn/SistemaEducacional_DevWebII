const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { authenticateToken, requireProfessor, requireAluno } = require('../middleware/auth');

// Rotas públicas autenticadas
router.get('/', authenticateToken, activityController.getActivities);
router.get('/:id', authenticateToken, activityController.getActivityById);

// Rotas de professor
router.post('/', authenticateToken, requireProfessor, activityController.createActivity);
router.put('/:id', authenticateToken, requireProfessor, activityController.updateActivity);
router.delete('/:id', authenticateToken, requireProfessor, activityController.deleteActivity);

// Rotas de aluno
router.post('/submit', authenticateToken, requireAluno, activityController.submitActivity);

module.exports = router;