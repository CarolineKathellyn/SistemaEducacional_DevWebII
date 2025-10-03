const fs = require('fs').promises;
const path = require('path');

async function generateHTML(parsedData, activityInfo) {
  const { metadata, htmlContent, fullText, sections } = parsedData;

  // Usar o HTML gerado pelo mammoth ou o texto completo
  let content = htmlContent || '';

  // Se não tiver htmlContent, usar fullText ou conteudoCompleto das sections
  if (!content) {
    const textToUse = fullText || (sections && sections.conteudoCompleto) || '';
    content = formatTextToHTML(textToUse);
  }

  // Se ainda não tiver conteúdo, mostrar mensagem
  if (!content || content.trim() === '') {
    content = '<p><em>Não foi possível extrair o conteúdo do documento. Por favor, verifique o arquivo enviado.</em></p>';
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.titulo || activityInfo.titulo || 'Atividade'}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }

        .header h1 {
            font-size: 2em;
            margin-bottom: 15px;
        }

        .header-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            font-size: 0.95em;
        }

        .info-item {
            background: rgba(255,255,255,0.1);
            padding: 10px 15px;
            border-radius: 5px;
        }

        .deadline {
            background: #ff6b6b;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            color: white;
            text-align: center;
            font-weight: bold;
        }

        .content-area {
            padding: 20px;
            background: #fafafa;
            border-radius: 8px;
            margin-bottom: 30px;
        }

        .content-area h1,
        .content-area h2,
        .content-area h3 {
            color: #667eea;
            margin-top: 25px;
            margin-bottom: 15px;
        }

        .content-area h1 {
            font-size: 1.8em;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }

        .content-area h2 {
            font-size: 1.5em;
        }

        .content-area h3 {
            font-size: 1.2em;
        }

        .content-area p {
            margin-bottom: 12px;
            text-align: justify;
        }

        .content-area ul,
        .content-area ol {
            margin-left: 30px;
            margin-bottom: 15px;
        }

        .content-area li {
            margin-bottom: 8px;
        }

        .content-area strong {
            color: #555;
            font-weight: 600;
        }

        .content-area a {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }

        .content-area a:hover {
            text-decoration: underline;
        }

        .actions {
            margin-top: 30px;
            text-align: center;
            padding: 20px;
            border-top: 2px solid #eee;
        }

        .btn {
            display: inline-block;
            padding: 12px 30px;
            margin: 0 10px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            font-size: 1em;
            transition: background 0.3s;
        }

        .btn:hover {
            background: #5568d3;
        }

        .btn-secondary {
            background: #6c757d;
        }

        .btn-secondary:hover {
            background: #5a6268;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }
            .container {
                box-shadow: none;
                padding: 20px;
            }
            .actions {
                display: none;
            }
        }

        @media (max-width: 768px) {
            .header-info {
                grid-template-columns: 1fr;
            }
            .container {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${metadata.titulo || activityInfo.titulo}</h1>
            <div class="header-info">
                <div class="info-item">
                    <strong>Curso:</strong> ${metadata.curso || activityInfo.curso}
                </div>
                <div class="info-item">
                    <strong>Módulo:</strong> ${metadata.modulo || activityInfo.modulo}
                </div>
                <div class="info-item">
                    <strong>Agenda:</strong> ${metadata.agenda || activityInfo.agenda}
                </div>
                <div class="info-item">
                    <strong>Professor:</strong> ${metadata.professor || activityInfo.professor_nome}
                </div>
            </div>
        </div>

        <div class="deadline">
            <p>📅 Prazo Inicial: ${formatDate(activityInfo.data_inicio)} | Prazo Final: ${formatDate(activityInfo.data_fim)}</p>
        </div>

        <div class="content-area">
            ${content}
        </div>

        <div class="actions">
            <button onclick="window.print()" class="btn">🖨️ Imprimir</button>
            <button onclick="window.history.back()" class="btn btn-secondary">← Voltar</button>
        </div>
    </div>
</body>
</html>`;

  return html;
}

function formatTextToHTML(text) {
  if (!text) return '';

  // Converter texto simples em HTML formatado
  return text
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.trim().replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

module.exports = { generateHTML };
