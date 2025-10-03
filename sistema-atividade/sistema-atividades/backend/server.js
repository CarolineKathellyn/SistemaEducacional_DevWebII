const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Servir arquivos gerados
app.use('/generated', express.static(path.join(__dirname, 'generated')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importando as rotas
const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activities');
const uploadRoutes = require('./routes/upload');

// Usando as rotas
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/upload', uploadRoutes);

// Rota inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});