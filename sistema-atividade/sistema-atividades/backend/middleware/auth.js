const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_key_aqui';

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

exports.requireProfessor = (req, res, next) => {
  if (req.user.tipo !== 'professor') {
    return res.status(403).json({ error: 'Acesso negado. Apenas professores.' });
  }
  next();
};

exports.requireAluno = (req, res, next) => {
  if (req.user.tipo !== 'aluno') {
    return res.status(403).json({ error: 'Acesso negado. Apenas alunos.' });
  }
  next();
};