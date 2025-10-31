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

        ${activityInfo.data_inicio || activityInfo.data_fim ? `
        <div class="deadline">
            ${activityInfo.data_inicio ? `📅 Prazo Inicial: ${formatDate(activityInfo.data_inicio)}` : ''}
            ${activityInfo.data_inicio && activityInfo.data_fim ? ' | ' : ''}
            ${activityInfo.data_fim ? `Prazo Final: ${formatDate(activityInfo.data_fim)}` : ''}
        </div>` : ''}

        ${content}
    </div>
</body>
</html>`;

  return html;
}

function formatTextToHTML(text) {
  if (!text) return '';

  // Se o texto já contém tags HTML (incluindo imagens e formatação), retornar diretamente
  if (/<[^>]+>/.test(text)) {
    // Preservar HTML existente com formatação e imagens
    let html = text;

    // Garantir que strong/bold esteja com a formatação correta
    html = html.replace(/<strong>/g, '<strong style="font-weight: bold;">');
    html = html.replace(/<b>/g, '<strong style="font-weight: bold;">');

    // ENVOLVER TODAS AS IMAGENS (exceto ícones de seção) COM DIV DE CONTROLE
    // Procurar por TODAS as tags img e envolver com div
    // para controlar posicionamento (float left) e tamanho
    html = html.replace(
      /<img([^>]*)>/gi,
      function(match, attributes) {
        // Verificar se é um ícone de seção (imagem dentro de <p><img/></p>)
        // Ícones não devem ter wrapper

        // Extrair width da imagem se existir, senão usar 180px
        const widthMatch = attributes.match(/width="(\d+)"/);
        const width = widthMatch ? widthMatch[1] : '180';

        // Criar div wrapper com float left e controle de tamanho
        return `<div style="float: left; width: ${width}px; margin-right: 15px; margin-bottom: 10px;">` +
               `<img${attributes} style="max-width: 100%; height: auto; display: block;">` +
               `</div>`;
      }
    );

    return html;
  }

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
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&family=Open+Sans:wght@300;400;600&display=swap');

        html {
            scroll-behavior: smooth;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Open Sans', 'Segoe UI', sans-serif;
            line-height: 1.6;
            color: #2d3748;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            min-height: 100vh;
            padding: 40px 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            box-shadow: 0 20px 60px rgba(0,0,0,0.15);
            border-radius: 12px;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            padding: 50px 40px;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 400px;
            height: 400px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
        }
        .header-content {
            position: relative;
            z-index: 1;
        }
        .header-icon {
            font-size: 56px;
            margin-bottom: 15px;
            display: inline-block;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
        }
        .header h1 {
            font-family: 'Merriweather', serif;
            font-size: 2.5em;
            font-weight: 700;
            margin-bottom: 10px;
            line-height: 1.2;
        }
        .header-subtitle {
            font-size: 1.1em;
            opacity: 0.95;
            font-weight: 300;
            letter-spacing: 0.5px;
        }
        .content-wrapper {
            padding: 50px 60px;
            background: white;
        }
        .content {
            font-family: Calibri, 'Open Sans', Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.5;
            color: #2d3748;
        }
        .content p {
            margin-bottom: 18px;
            text-align: justify;
            font-family: Calibri, 'Open Sans', Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.5;
            overflow: auto; /* Clearfix para imagens flutuantes */
        }
        .content p:first-child::first-letter {
            font-size: 3.5em;
            font-family: 'Merriweather', serif;
            font-weight: 700;
            float: left;
            line-height: 0.8;
            margin: 8px 8px 0 0;
            color: #1e3a8a;
        }
        .content strong {
            color: #1e3a8a;
            font-weight: 700 !important;
        }
        .content b {
            color: #1e3a8a;
            font-weight: 700 !important;
        }
        .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 {
            color: #1e3a8a;
            font-weight: 700 !important;
            margin-bottom: 15px;
            font-family: Calibri, 'Open Sans', Arial, sans-serif;
            clear: both; /* Evitar que títulos fiquem ao lado de imagens flutuantes */
        }
        .content h1 {
            font-size: 16pt;
        }
        .content h2 {
            font-size: 14pt;
        }
        .content h3 {
            font-size: 12pt;
        }
        .content img {
            /* Imagens serão controladas pela div wrapper */
        }
        /* Suporte para imagens flutuantes (wrapping de texto) */
        .content > div {
            margin-bottom: 10px;
        }
        /* Clearfix após parágrafos com imagens */
        .content::after {
            content: "";
            display: table;
            clear: both;
        }
        .divider {
            height: 3px;
            background: linear-gradient(90deg, #1e3a8a 0%, #3b82f6 50%, transparent 100%);
            margin: 30px 0;
            border-radius: 2px;
        }
        .actions {
            padding: 30px 60px 50px;
            text-align: center;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
        }
        .btn {
            display: inline-block;
            padding: 14px 32px;
            margin: 0 10px;
            background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(30, 58, 138, 0.3);
            font-family: 'Open Sans', sans-serif;
        }
        .btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(30, 58, 138, 0.4);
        }
        .btn:active {
            transform: translateY(-1px);
        }
        .btn-secondary {
            background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%);
            box-shadow: 0 4px 15px rgba(100, 116, 139, 0.3);
        }
        .btn-secondary:hover {
            box-shadow: 0 8px 25px rgba(100, 116, 139, 0.4);
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }
            .container {
                box-shadow: none;
                max-width: 100%;
            }
            .actions {
                display: none;
            }
            .header {
                background: #1e3a8a !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }

        @media (max-width: 768px) {
            .content-wrapper {
                padding: 30px 25px;
            }
            .header {
                padding: 35px 25px;
            }
            .header h1 {
                font-size: 1.8em;
            }
            .actions {
                padding: 25px 20px 35px;
            }
            .btn {
                display: block;
                margin: 10px 0;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-content">
                <div class="header-icon">${sectionIcon}</div>
                <h1>${sectionTitle}</h1>
                <p class="header-subtitle">${activityInfo.titulo}</p>
            </div>
        </div>
        <div class="content-wrapper">
            <div class="content">
                ${formatTextToHTML(sectionContent)}
            </div>
        </div>
        <div class="actions">
            <button onclick="window.history.back()" class="btn btn-secondary">← Voltar ao Menu</button>
            <button onclick="openEditor()" class="btn" id="toggleEditorBtn">✏️ Editar HTML/CSS</button>
        </div>

        <!-- Editor HTML/CSS -->
        <div id="editorPanel" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 9999; overflow: auto;">
            <div style="max-width: 1400px; margin: 0 auto; padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="color: white; margin: 0;">Editor HTML/CSS</h2>
                    <div>
                        <button onclick="applyChanges()" style="padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px; font-weight: 600;">✓ Aplicar</button>
                        <button onclick="closeEditor()" style="padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">✕ Fechar</button>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <!-- HTML Editor -->
                    <div>
                        <label style="color: white; display: block; margin-bottom: 10px; font-weight: 600; font-size: 14px;">HTML do Conteúdo</label>
                        <textarea id="htmlEditor" style="width: 100%; height: 400px; background: #1e1e1e; color: #d4d4d4; border: 1px solid #3e3e42; border-radius: 6px; padding: 15px; font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.6; resize: vertical;"></textarea>
                    </div>

                    <!-- CSS Editor -->
                    <div>
                        <label style="color: white; display: block; margin-bottom: 10px; font-weight: 600; font-size: 14px;">CSS Customizado</label>
                        <textarea id="cssEditor" style="width: 100%; height: 400px; background: #1e1e1e; color: #d4d4d4; border: 1px solid #3e3e42; border-radius: 6px; padding: 15px; font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; line-height: 1.6; resize: vertical;"></textarea>
                    </div>
                </div>

                <!-- Preview -->
                <div>
                    <label style="color: white; display: block; margin-bottom: 10px; font-weight: 600; font-size: 14px;">Preview</label>
                    <div id="previewPane" style="background: white; border-radius: 6px; padding: 40px; min-height: 300px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);"></div>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; border-radius: 4px;">
                    <p style="color: #93c5fd; margin: 0; font-size: 13px;">
                        💡 <strong>Dica:</strong> Edite o HTML e CSS acima. O HTML mostra apenas o conteúdo do texto (não a estrutura da página). Clique em "Aplicar" para salvar permanentemente as alterações.
                    </p>
                </div>
            </div>
        </div>

        <script>
            // Extrair timestamp e section key da URL para carregar arquivos raw
            const currentUrl = window.location.pathname;
            const urlMatch = currentUrl.match(/section_(\\w+)_(\\d+)\\.html/);
            const sectionKey = urlMatch ? urlMatch[1] : null;
            const timestamp = urlMatch ? urlMatch[2] : null;

            // Função para abrir o editor
            function openEditor() {
                try {
                    const editor = document.getElementById('editorPanel');
                    const htmlEditor = document.getElementById('htmlEditor');
                    const cssEditor = document.getElementById('cssEditor');

                    if (!editor || !htmlEditor || !cssEditor) {
                        alert('Erro: Elementos não encontrados!');
                        return;
                    }

                    // Mostrar editor
                    editor.style.display = 'block';
                    document.body.style.overflow = 'hidden';

                    // Tentar carregar arquivos HTML/CSS brutos (raw) salvos durante o upload
                    if (sectionKey && timestamp) {
                        const rawHtmlUrl = '/generated/section_' + sectionKey + '_' + timestamp + '_raw.html';
                        const rawCssUrl = '/generated/section_' + sectionKey + '_' + timestamp + '_raw.css';

                        console.log('Tentando carregar arquivos editáveis:', rawHtmlUrl, rawCssUrl);

                        // Carregar HTML raw
                        fetch(rawHtmlUrl)
                            .then(response => {
                                if (response.ok) {
                                    return response.text();
                                }
                                throw new Error('Arquivo HTML raw não encontrado');
                            })
                            .then(html => {
                                htmlEditor.value = html;
                                console.log('HTML raw carregado:', html.length, 'caracteres');
                            })
                            .catch(error => {
                                console.warn('Usando fallback para HTML:', error);
                                // Fallback: usar APENAS o conteúdo da div .content
                                const contentDiv = document.querySelector('.content');
                                if (contentDiv) {
                                    htmlEditor.value = contentDiv.innerHTML;
                                }
                            });

                        // Carregar CSS raw
                        fetch(rawCssUrl)
                            .then(response => {
                                if (response.ok) {
                                    return response.text();
                                }
                                throw new Error('Arquivo CSS raw não encontrado');
                            })
                            .then(css => {
                                cssEditor.value = css;
                                console.log('CSS raw carregado:', css.length, 'caracteres');
                                doUpdatePreview();
                            })
                            .catch(error => {
                                console.warn('Usando fallback para CSS:', error);
                                // Fallback: usar estilos da página
                                loadStylesFromPage();
                            });
                    } else {
                        // Fallback: carregar APENAS o conteúdo da div .content
                        const contentDiv = document.querySelector('.content');
                        if (contentDiv) {
                            htmlEditor.value = contentDiv.innerHTML;
                        }
                        loadStylesFromPage();
                    }

                } catch (error) {
                    console.error('Erro ao abrir editor:', error);
                    alert('Erro ao abrir editor: ' + error.message);
                }
            }

            // Função auxiliar para carregar estilos da página
            function loadStylesFromPage() {
                const cssEditor = document.getElementById('cssEditor');
                const allStyles = [];

                const styleTags = document.querySelectorAll('style');
                styleTags.forEach((styleTag, index) => {
                    if (styleTag.textContent.includes('editorPanel') ||
                        styleTag.textContent.includes('slideIn')) {
                        return;
                    }
                    allStyles.push('/* Style tag ' + (index + 1) + ' */');
                    allStyles.push(styleTag.textContent);
                    allStyles.push('');
                });

                const customStyles = document.getElementById('customStyles');
                if (customStyles && customStyles.textContent.trim()) {
                    allStyles.push('/* CSS Customizado */');
                    allStyles.push(customStyles.textContent);
                }

                if (allStyles.length === 0) {
                    allStyles.push('/* Adicione seu CSS customizado aqui */');
                }

                cssEditor.value = allStyles.join('\\n');
                doUpdatePreview();
            }

            // Função para fechar o editor
            function closeEditor() {
                const editor = document.getElementById('editorPanel');
                if (editor) {
                    editor.style.display = 'none';
                    document.body.style.overflow = 'auto';
                }
            }

            // Função para atualizar o preview
            function doUpdatePreview() {
                try {
                    const htmlEditor = document.getElementById('htmlEditor');
                    const cssEditor = document.getElementById('cssEditor');
                    const preview = document.getElementById('previewPane');

                    if (!htmlEditor || !cssEditor || !preview) {
                        return;
                    }

                    const htmlContent = htmlEditor.value;
                    const cssContent = cssEditor.value;

                    // Criar preview com estilos aplicados
                    // Criar um mini documento com os estilos
                    preview.innerHTML = '<style>' + cssContent + '</style>' +
                        '<div style="background: white; min-height: 400px;">' +
                        htmlContent +
                        '</div>';
                } catch (error) {
                    console.error('Erro ao atualizar preview:', error);
                }
            }

            // Função para aplicar mudanças
            function applyChanges() {
                try {
                    const htmlEditor = document.getElementById('htmlEditor');
                    const cssEditor = document.getElementById('cssEditor');
                    const contentDiv = document.querySelector('.content');

                    if (!htmlEditor || !cssEditor || !contentDiv) {
                        alert('Erro ao aplicar mudanças!');
                        return;
                    }

                    // Atualizar APENAS o conteúdo da div .content (preservando estrutura da página)
                    contentDiv.innerHTML = htmlEditor.value;

                    // Atualizar/criar tag de estilo para o CSS editado
                    let customStyleTag = document.getElementById('customStyles');
                    if (!customStyleTag) {
                        customStyleTag = document.createElement('style');
                        customStyleTag.id = 'customStyles';
                        document.head.appendChild(customStyleTag);
                    }
                    customStyleTag.textContent = cssEditor.value;

                    // Salvar no servidor se temos sectionKey e timestamp
                    if (sectionKey && timestamp) {
                        const token = localStorage.getItem('token');
                        if (!token) {
                            showNotification('⚠️ Alterações aplicadas localmente (token não encontrado)');
                            closeEditor();
                            return;
                        }

                        // Enviar para o servidor
                        fetch('/api/upload/save-section', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            },
                            body: JSON.stringify({
                                sectionKey: sectionKey,
                                timestamp: timestamp,
                                htmlContent: htmlEditor.value,
                                cssContent: cssEditor.value
                            })
                        })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Erro ao salvar no servidor: ' + response.status);
                            }
                            return response.json();
                        })
                        .then(data => {
                            console.log('Alterações salvas no servidor:', data);
                            showNotification('✓ Alterações salvas permanentemente!');
                        })
                        .catch(error => {
                            console.error('Erro ao salvar no servidor:', error);
                            showNotification('⚠️ Alterações aplicadas localmente (erro ao salvar no servidor)');
                        });
                    } else {
                        showNotification('✓ Alterações aplicadas localmente!');
                    }

                    // Fechar editor
                    closeEditor();

                    // Reconfigurar eventos do botão de voltar (caso tenha sido alterado)
                    setTimeout(function() {
                        const backBtn = document.querySelector('button[onclick*="history.back"]');
                        const editBtn = document.querySelector('button[onclick*="openEditor"]');

                        if (editBtn && !editBtn.onclick) {
                            editBtn.onclick = openEditor;
                        }
                    }, 100);
                } catch (error) {
                    console.error('Erro ao aplicar mudanças:', error);
                    alert('Erro ao aplicar mudanças: ' + error.message);
                }
            }

            function showNotification(message) {
                const notification = document.createElement('div');
                notification.textContent = message;
                notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); z-index: 10000; font-weight: 600; animation: slideIn 0.3s ease;';
                document.body.appendChild(notification);

                setTimeout(() => {
                    notification.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => notification.remove(), 300);
                }, 3000);
            }

            // Configurar eventos quando a página carregar
            document.addEventListener('DOMContentLoaded', function() {
                console.log('Página carregada!');

                const htmlEditor = document.getElementById('htmlEditor');
                const cssEditor = document.getElementById('cssEditor');

                if (htmlEditor) {
                    htmlEditor.addEventListener('input', doUpdatePreview);
                }

                if (cssEditor) {
                    cssEditor.addEventListener('input', doUpdatePreview);
                }

                console.log('Editor configurado e pronto!');
            });
        </script>

        <style>
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }

            #editorPanel textarea {
                scrollbar-width: thin;
                scrollbar-color: #4b5563 #1e1e1e;
            }

            #editorPanel textarea::-webkit-scrollbar {
                width: 8px;
            }

            #editorPanel textarea::-webkit-scrollbar-track {
                background: #1e1e1e;
            }

            #editorPanel textarea::-webkit-scrollbar-thumb {
                background: #4b5563;
                border-radius: 4px;
            }

            #editorPanel textarea::-webkit-scrollbar-thumb:hover {
                background: #6b7280;
            }
        </style>
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
