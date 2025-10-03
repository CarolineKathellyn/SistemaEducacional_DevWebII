const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../database/sistema.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // Tabela de usuários
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('professor', 'aluno')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de atividades
    db.run(`
      CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        professor_id INTEGER NOT NULL,
        curso TEXT NOT NULL,
        professor_nome TEXT NOT NULL,
        modulo TEXT NOT NULL,
        agenda TEXT NOT NULL,
        titulo TEXT NOT NULL,
        arquivo_original TEXT,
        arquivo_html TEXT,
        data_inicio DATETIME NOT NULL,
        data_fim DATETIME NOT NULL,
        status TEXT DEFAULT 'ativa',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (professor_id) REFERENCES users(id)
      )
    `);

    // Tabela de submissões
    db.run(`
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activity_id INTEGER NOT NULL,
        aluno_id INTEGER NOT NULL,
        arquivo TEXT,
        texto_resposta TEXT,
        data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (activity_id) REFERENCES activities(id),
        FOREIGN KEY (aluno_id) REFERENCES users(id)
      )
    `);

    // Criar usuário professor padrão (senha: admin123)
    const hashedPassword = '$2a$10$XQXm8qHPQeJ8xZxQxQxQeOZXm8qHPQeJ8xZxQxQxQe'; // bcrypt hash
    db.run(`
      INSERT OR IGNORE INTO users (nome, email, senha, tipo) 
      VALUES ('Professor Demo', 'professor@sistema.com', ?, 'professor')
    `, [hashedPassword]);

    // Criar usuário aluno padrão (senha: aluno123)
    db.run(`
      INSERT OR IGNORE INTO users (nome, email, senha, tipo) 
      VALUES ('Aluno Demo', 'aluno@sistema.com', ?, 'aluno')
    `, [hashedPassword]);
  });
}

module.exports = db;