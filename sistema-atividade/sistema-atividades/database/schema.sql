-- Criação das tabelas do sistema

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('professor', 'aluno')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de atividades
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
);

-- Tabela de submissões
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    aluno_id INTEGER NOT NULL,
    arquivo TEXT,
    texto_resposta TEXT,
    data_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    FOREIGN KEY (aluno_id) REFERENCES users(id)
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_activities_professor ON activities(professor_id);
CREATE INDEX IF NOT EXISTS idx_activities_dates ON activities(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_submissions_activity ON submissions(activity_id);
CREATE INDEX IF NOT EXISTS idx_submissions_aluno ON submissions(aluno_id);