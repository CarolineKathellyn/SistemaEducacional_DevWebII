const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'sistema.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao criar banco:', err.message);
        process.exit(1);
    }
    console.log('Banco de dados criado com sucesso');
});

async function initDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            try {
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

                const senhaProfessor = await bcrypt.hash('admin123', 10);
                const senhaAluno = await bcrypt.hash('aluno123', 10);

                db.run(
                    'INSERT OR IGNORE INTO users (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
                    ['Professor Demo', 'professor@sistema.com', senhaProfessor, 'professor']
                );

                db.run(
                    'INSERT OR IGNORE INTO users (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
                    ['Aluno Demo', 'aluno@sistema.com', senhaAluno, 'aluno']
                );

                console.log('Banco inicializado com sucesso!');
                console.log('Professor: professor@sistema.com / admin123');
                console.log('Aluno: aluno@sistema.com / aluno123');
                
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
}

initDatabase()
    .then(() => {
        db.close();
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        db.close();
        process.exit(1);
    });