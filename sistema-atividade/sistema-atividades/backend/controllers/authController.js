const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'seu_secret_key_aqui';

exports.login = (req, res) => {
  const { email, senha } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const senhaValida = await bcrypt.compare(senha, user.senha);
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, tipo: user.tipo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo
      }
    });
  });
};

exports.register = async (req, res) => {
  const { nome, email, senha, tipo } = req.body;

  try {
    const senhaHash = await bcrypt.hash(senha, 10);

    db.run(
      'INSERT INTO users (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
      [nome, email, senhaHash, tipo],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Email já cadastrado' });
          }
          return res.status(500).json({ error: 'Erro ao criar usuário' });
        }

        res.status(201).json({
          message: 'Usuário criado com sucesso',
          userId: this.lastID
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Erro no servidor' });
  }
};