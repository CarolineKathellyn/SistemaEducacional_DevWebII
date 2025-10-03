const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const upload = require('../middleware/upload');
const { authenticateToken, requireProfessor } = require('../middleware/auth');

router.post(
  '/document',
  authenticateToken,
  requireProfessor,
  upload.single('document'),
  uploadController.uploadDocument
);

router.post(
  '/generate-html',
  authenticateToken,
  requireProfessor,
  uploadController.generateActivityHTML
);

module.exports = router;