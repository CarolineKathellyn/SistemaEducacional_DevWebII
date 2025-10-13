const fs = require('fs').promises;
const path = require('path');

async function generateHTML(parsedData, activityInfo, timestamp) {
  const { metadata, htmlContent, fullText, sections } = parsedData;

  // Gerar apenas o menu de navegação
  let content = '';

  if (metadata.sections) {
    content = generateNavigationMenu(metadata.sections, activityInfo, timestamp);
  } else if (htmlContent) {
    content = htmlContent;
  } else if (fullText) {
    content = formatTextToHTML(fullText);
  } else if (sections && sections.conteudoCompleto) {
    content = formatTextToHTML(sections.conteudoCompleto);
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            color: white;
            margin-bottom: 40px;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }

        .header-info {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 12px;
            margin-top: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .info-item {
            color: white;
            font-size: 0.95em;
        }

        .info-item strong {
            display: block;
            margin-bottom: 5px;
            opacity: 0.9;
        }

        .deadline {
            background: rgba(255, 107, 107, 0.9);
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 40px;
            color: white;
            text-align: center;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }
            .header-info {
                grid-template-columns: 1fr;
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
                    <strong>📚 Curso:</strong>
                    ${metadata.curso || activityInfo.curso}
                </div>
                <div class="info-item">
                    <strong>📖 Módulo:</strong>
                    ${metadata.modulo || activityInfo.modulo}
                </div>
                <div class="info-item">
                    <strong>📅 Agenda:</strong>
                    ${metadata.agenda || activityInfo.agenda}
                </div>
                <div class="info-item">
                    <strong>👨‍🏫 Professor:</strong>
                    ${metadata.professor || activityInfo.professor_nome}
                </div>
            </div>
        </div>

        <div class="deadline">
            📅 Prazo Inicial: ${formatDate(activityInfo.data_inicio)} | Prazo Final: ${formatDate(activityInfo.data_fim)}
        </div>

        ${content}
    </div>
</body>
</html>`;

  return html;
}

function formatTextToHTML(text) {
  if (!text) return '';

  // Limpar o texto e agrupar linhas quebradas incorretamente
  let cleanedText = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  // Agrupar linhas que fazem parte do mesmo parágrafo
  // Uma linha que não termina com pontuação deve ser juntada com a próxima
  const lines = cleanedText.split('\n');
  const paragraphs = [];
  let currentParagraph = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Se a linha atual está vazia, pular
    if (!line.trim()) continue;

    // Adicionar a linha ao parágrafo atual
    if (currentParagraph) {
      // Se a linha anterior não termina com pontuação, juntar com espaço
      if (!/[.!?:;]$/.test(currentParagraph.trim())) {
        currentParagraph += ' ' + line;
      } else {
        // Caso contrário, iniciar novo parágrafo
        paragraphs.push(currentParagraph);
        currentParagraph = line;
      }
    } else {
      currentParagraph = line;
    }

    // Se esta linha termina com pontuação e a próxima começa com maiúscula ou é título
    const nextLine = lines[i + 1];
    if (nextLine && /[.!?:]$/.test(line) && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(nextLine)) {
      paragraphs.push(currentParagraph);
      currentParagraph = '';
    }
  }

  // Adicionar o último parágrafo se houver
  if (currentParagraph) {
    paragraphs.push(currentParagraph);
  }

  // Converter parágrafos em HTML
  return paragraphs
    .filter(p => p.trim().length > 0)
    .map(p => `<p>${p.trim()}</p>`)
    .join('\n');
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

function generateNavigationMenu(sections, activityInfo, timestamp) {
  // Mapeamento de chaves para títulos e ícones
  const sectionTitles = {
    'apresentacao': { title: 'Apresentação', icon: '📚' },
    'momentoReflexao': { title: 'Momento de Reflexão', icon: '💭' },
    'porqueAprender': { title: 'Por que Aprender?', icon: '❓' },
    'paraComeccar': { title: 'Para Começar o Assunto', icon: '🚀' },
    'mergulhando': { title: 'Mergulhando no Tema', icon: '🏊' },
    'videoaulas': { title: 'Videoaulas', icon: '🎥' },
    'ampliandoHorizontes': { title: 'Ampliando Horizontes', icon: '🌅' },
    'resumindo': { title: 'Resumindo o Estudo', icon: '📝' },
    'atividades': { title: 'Atividades', icon: '✍️' },
    'atividadesMediadas': { title: 'Atividades Mediadas', icon: '👥' },
    'atividadeOnline': { title: 'Atividade Online', icon: '💻' },
    'forumColaboracao': { title: 'Fórum de Colaboração e Apoio', icon: '💬' },
    'questionario': { title: 'Questionário', icon: '📋' },
    'atividadesNaoMediadas': { title: 'Atividades Não Mediadas', icon: '📖' },
    'faleComProfessor': { title: 'Fale com o seu Professor Mediador', icon: '👨‍🏫' },
    'fichario': { title: 'Fichário', icon: '📁' },
    'midiateca': { title: 'Midiateca', icon: '🗂️' },
    'faleComTutor': { title: 'Fale com o seu Tutor', icon: '👤' }
  };

  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

  const sectionConfig = [];
  let colorIndex = 0;

  // Converter seções dinâmicas em configuração
  for (const key of Object.keys(sections)) {
    if (key === 'prazos') continue; // Ignorar prazos

    // Usar título mapeado ou gerar um a partir da chave
    const mapped = sectionTitles[key];
    const title = mapped ? mapped.title : key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const icon = mapped ? mapped.icon : '📄';

    sectionConfig.push({
      key: key,
      title: title,
      color: colors[colorIndex % colors.length],
      icon: icon
    });

    colorIndex++;
  }

  const availableSections = sectionConfig.filter(section =>
    sections[section.key] && sections[section.key].trim()
  );

  if (availableSections.length === 0) {
    return `
      <div style="background: white; border-radius: 20px; padding: 50px 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); text-align: center;">
        <div style="font-size: 64px; margin-bottom: 20px;">📄</div>
        <h2 style="color: #667eea; font-size: 24pt; margin-bottom: 15px;">Nenhuma seção identificada</h2>
        <p style="color: #6b7280; font-size: 12pt; margin-bottom: 30px; max-width: 600px; margin-left: auto; margin-right: auto;">
          O sistema não conseguiu identificar seções estruturadas no documento.<br>
          Certifique-se de que o documento contém títulos como:<br>
          <strong>"Momento de Reflexão"</strong>, <strong>"Por que Aprender?"</strong>, etc.
        </p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin-top: 30px; text-align: left; max-width: 700px; margin-left: auto; margin-right: auto;">
          <h3 style="color: #374151; font-size: 14pt; margin-bottom: 15px;">💡 Títulos suportados:</h3>
          <ul style="color: #6b7280; font-size: 11pt; line-height: 1.8; columns: 2; column-gap: 20px;">
            <li>Apresentação</li>
            <li>Momento de Reflexão</li>
            <li>Por que Aprender?</li>
            <li>Para Começar o Assunto</li>
            <li>Mergulhando no Tema</li>
            <li>Videoaulas</li>
            <li>Ampliando Horizontes</li>
            <li>Resumindo o Estudo</li>
            <li>Atividades</li>
            <li>Atividades Mediadas</li>
            <li>Atividade on-line</li>
            <li>Fórum de Colaboração e Apoio</li>
            <li>Questionário</li>
            <li>Atividades não mediadas</li>
            <li>Fale com o seu Professor Mediador</li>
            <li>Fichário</li>
            <li>Midiateca</li>
            <li>Fale com o seu Tutor</li>
          </ul>
        </div>
      </div>
    `;
  }

  // Gerar menu de navegação apenas com links
  let navigationMenu = `
    <div style="background: white; border-radius: 20px; padding: 50px 30px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
      <h2 style="color: #667eea; font-family: 'Segoe UI', sans-serif; font-size: 28pt; margin-bottom: 15px; text-align: center; font-weight: 700;">
        📑 Conteúdo da Atividade
      </h2>
      <p style="text-align: center; color: #6b7280; font-size: 12pt; margin-bottom: 40px;">
        Clique em cada seção abaixo para acessar o conteúdo
      </p>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
  `;

  for (const section of availableSections) {
    const sectionFileName = `section_${section.key}_${timestamp}.html`;

    navigationMenu += `
      <a href="${sectionFileName}" style="text-decoration: none; display: block;">
        <div style="background: linear-gradient(135deg, ${section.color} 0%, ${adjustColor(section.color, -20)} 100%); border-radius: 15px; padding: 30px 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); transition: all 0.3s; cursor: pointer; height: 100%;"
             onmouseover="this.style.transform='translateY(-8px)'; this.style.boxShadow='0 12px 35px rgba(0,0,0,0.25)';"
             onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 20px rgba(0,0,0,0.15)';">
          <div style="text-align: center;">
            <div style="font-size: 48px; margin-bottom: 15px;">${section.icon}</div>
            <h3 style="font-family: 'Segoe UI', sans-serif; font-size: 15pt; margin: 0 0 10px 0; color: white; font-weight: 600;">${section.title}</h3>
            <div style="height: 2px; width: 50px; background: rgba(255,255,255,0.5); margin: 10px auto;"></div>
            <p style="color: rgba(255,255,255,0.95); font-size: 10pt; margin: 10px 0 0 0; font-weight: 500;">Clique para acessar →</p>
          </div>
        </div>
      </a>
    `;
  }

  navigationMenu += `
      </div>
    </div>
  `;

  return navigationMenu;
}

function adjustColor(color, percent) {
  const num = parseInt(color.replace("#",""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
    (G<255?G<1?0:G:255)*0x100 +
    (B<255?B<1?0:B:255))
    .toString(16).slice(1);
}

function generateSectionPage(sectionKey, sectionTitle, sectionIcon, sectionContent, sectionColor, activityInfo) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${sectionTitle} - ${activityInfo.titulo}</title>
    <style>
        html {
            scroll-behavior: smooth;
        }
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
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, ${sectionColor} 0%, ${adjustColor(sectionColor, -20)} 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 20px;
        }
        .header-icon {
            font-size: 48px;
        }
        .header h1 {
            font-size: 2em;
            margin: 0;
        }
        .content {
            padding: 20px;
            font-family: Calibri, Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #1f2937;
        }
        .content p {
            margin-bottom: 15px;
            text-align: justify;
            font-family: Calibri, Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.5;
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
            background: ${sectionColor};
            color: white;
            text-decoration: none;
            border-radius: 5px;
            border: none;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.3s;
        }
        .btn:hover {
            opacity: 0.8;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="header-icon">${sectionIcon}</span>
            <div>
                <h1>${sectionTitle}</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">${activityInfo.titulo}</p>
            </div>
        </div>
        <div class="content">
            ${formatTextToHTML(sectionContent)}
        </div>
        <div class="actions">
            <button onclick="window.history.back()" class="btn">← Voltar ao Menu</button>
            <button onclick="window.print()" class="btn">🖨️ Imprimir</button>
        </div>
    </div>
</body>
</html>`;
}

async function generateSectionPages(sections, activityInfo, timestamp, outputDir) {
  const fs = require('fs').promises;
  const path = require('path');

  // Mapeamento de chaves para títulos e ícones (mesmo do menu)
  const sectionTitles = {
    'apresentacao': { title: 'Apresentação', icon: '📚' },
    'momentoReflexao': { title: 'Momento de Reflexão', icon: '💭' },
    'porqueAprender': { title: 'Por que Aprender?', icon: '❓' },
    'paraComeccar': { title: 'Para Começar o Assunto', icon: '🚀' },
    'mergulhando': { title: 'Mergulhando no Tema', icon: '🏊' },
    'videoaulas': { title: 'Videoaulas', icon: '🎥' },
    'ampliandoHorizontes': { title: 'Ampliando Horizontes', icon: '🌅' },
    'resumindo': { title: 'Resumindo o Estudo', icon: '📝' },
    'atividades': { title: 'Atividades', icon: '✍️' },
    'atividadesMediadas': { title: 'Atividades Mediadas', icon: '👥' },
    'atividadeOnline': { title: 'Atividade Online', icon: '💻' },
    'forumColaboracao': { title: 'Fórum de Colaboração e Apoio', icon: '💬' },
    'questionario': { title: 'Questionário', icon: '📋' },
    'atividadesNaoMediadas': { title: 'Atividades Não Mediadas', icon: '📖' },
    'faleComProfessor': { title: 'Fale com o seu Professor Mediador', icon: '👨‍🏫' },
    'fichario': { title: 'Fichário', icon: '📁' },
    'midiateca': { title: 'Midiateca', icon: '🗂️' },
    'faleComTutor': { title: 'Fale com o seu Tutor', icon: '👤' }
  };

  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];

  const generatedFiles = [];
  let colorIndex = 0;

  for (const [key, content] of Object.entries(sections)) {
    if (key === 'prazos' || !content || !content.trim()) continue;

    // Usar título mapeado ou gerar um a partir da chave
    const mapped = sectionTitles[key];
    const title = mapped ? mapped.title : key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const icon = mapped ? mapped.icon : '📄';
    const color = colors[colorIndex % colors.length];

    const sectionHTML = generateSectionPage(
      key,
      title,
      icon,
      content,
      color,
      activityInfo
    );

    const filename = `section_${key}_${timestamp}.html`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, sectionHTML);
    generatedFiles.push(filename);

    console.log(`✓ Seção gerada: ${title} -> ${filename}`);

    colorIndex++;
  }

  return generatedFiles;
}

module.exports = { generateHTML, generateSectionPages };
