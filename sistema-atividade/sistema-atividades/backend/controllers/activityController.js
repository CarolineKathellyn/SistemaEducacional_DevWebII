const db = require('../config/database');

exports.createActivity = (req, res) => {
  const {
    curso, professor_nome, modulo, agenda, titulo,
    data_inicio, data_fim, arquivo_html
  } = req.body;

  const professor_id = req.user.id;

  db.run(
    `INSERT INTO activities (
      professor_id, curso, professor_nome, modulo, agenda,
      titulo, arquivo_html, data_inicio, data_fim
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [professor_id, curso, professor_nome, modulo, agenda, titulo, arquivo_html, data_inicio, data_fim],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao criar atividade' });
      }

      res.status(201).json({
        message: 'Atividade criada com sucesso',
        activityId: this.lastID
      });
    }
  );
};

exports.getActivities = (req, res) => {
  const userTipo = req.user.tipo;
  const userId = req.user.id;

  let query;
  let params = [];

  if (userTipo === 'professor') {
    query = 'SELECT * FROM activities WHERE professor_id = ? ORDER BY created_at DESC';
    params = [userId];
  } else {
    query = 'SELECT * FROM activities WHERE status = "ativa" ORDER BY created_at DESC';
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar atividades' });
    }
    res.json(rows);
  });
};

exports.getActivityById = (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM activities WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar atividade' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }
    res.json(row);
  });
};

exports.updateActivity = (req, res) => {
  const { id } = req.params;
  const { curso, professor_nome, modulo, agenda, titulo, data_inicio, data_fim } = req.body;

  db.run(
    `UPDATE activities SET 
      curso = ?, professor_nome = ?, modulo = ?, agenda = ?,
      titulo = ?, data_inicio = ?, data_fim = ?
    WHERE id = ? AND professor_id = ?`,
    [curso, professor_nome, modulo, agenda, titulo, data_inicio, data_fim, id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao atualizar atividade' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Atividade não encontrada' });
      }
      res.json({ message: 'Atividade atualizada com sucesso' });
    }
  );
};

exports.deleteActivity = (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM activities WHERE id = ? AND professor_id = ?',
    [id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao deletar atividade' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Atividade não encontrada' });
      }
      res.json({ message: 'Atividade deletada com sucesso' });
    }
  );
};

exports.submitActivity = (req, res) => {
  const { activity_id, texto_resposta } = req.body;
  const aluno_id = req.user.id;
  const arquivo = req.file ? req.file.filename : null;

  // Verificar se a atividade ainda está aberta
  db.get('SELECT data_fim FROM activities WHERE id = ?', [activity_id], (err, activity) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao verificar atividade' });
    }
    if (!activity) {
      return res.status(404).json({ error: 'Atividade não encontrada' });
    }

    const now = new Date();
    const dataFim = new Date(activity.data_fim);

    if (now > dataFim) {
      return res.status(403).json({ error: 'Prazo de envio encerrado' });
    }

    // Inserir submissão com arquivo
    db.run(
      'INSERT INTO submissions (activity_id, aluno_id, texto_resposta, arquivo) VALUES (?, ?, ?, ?)',
      [activity_id, aluno_id, texto_resposta, arquivo],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Erro ao enviar atividade' });
        }
        res.status(201).json({
          message: 'Atividade enviada com sucesso',
          submissionId: this.lastID
        });
      }
    );
  });
};

exports.getSubmissions = (req, res) => {
  const { id } = req.params; // activity_id

  db.all(
    `SELECT s.*, u.nome as aluno_nome, u.email as aluno_email
     FROM submissions s
     JOIN users u ON s.aluno_id = u.id
     WHERE s.activity_id = ?
     ORDER BY s.data_envio DESC`,
    [id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar submissões' });
      }
      res.json(rows);
    }
  );
};
