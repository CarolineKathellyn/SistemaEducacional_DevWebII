const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const { pdf: pdfParse } = require('pdf-parse');
const sizeOf = require('image-size');

async function parseDocx(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();

    let text = '';
    let htmlContent = '';

    // Processar conforme tipo de arquivo
    if (ext === '.docx' || ext === '.doc') {
      // Processar Word com opções avançadas para preservar formatação e imagens
      const htmlResult = await mammoth.convertToHtml({
        path: filePath,
        convertImage: mammoth.images.imgElement(function(image) {
          return image.read("base64").then(function(imageBuffer) {
            const attributes = {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };

            try {
              console.log('\n=== IMAGEM PROCESSADA ===');

              // IMPORTANTE: O Mammoth fornece as dimensões da imagem conforme ela aparece no Word
              // através do objeto contentType. Vamos verificar se há informações de dimensão.

              // Tentar obter dimensões do documento Word (EMUs - English Metric Units)
              // 1 EMU = 1/914400 polegadas, 1 polegada = 96 pixels
              // Então: pixels = EMUs / 9525

              let finalWidth = 180; // Largura padrão menor (180px em vez de 250px)
              let finalHeight = null;

              // Se o Mammoth fornecer dimensões da imagem no documento, usar essas
              if (image.width && image.height) {
                // Converter EMUs para pixels
                finalWidth = Math.round(image.width / 9525);
                finalHeight = Math.round(image.height / 9525);
                console.log(`Dimensões do documento Word: ${finalWidth}x${finalHeight}px`);
              } else {
                // Fallback: usar dimensões da imagem mas com limite menor
                const buffer = Buffer.from(imageBuffer, 'base64');
                const dimensions = sizeOf(buffer);
                console.log('Dimensões originais da imagem:', dimensions);

                let imgWidth = dimensions.width;
                let imgHeight = dimensions.height;

                // Redimensionar para largura máxima de 180px
                const maxWidth = 180;
                if (imgWidth > maxWidth) {
                  const ratio = maxWidth / imgWidth;
                  finalWidth = maxWidth;
                  finalHeight = Math.round(imgHeight * ratio);
                } else {
                  finalWidth = imgWidth;
                  finalHeight = imgHeight;
                }
                console.log(`Dimensões ajustadas: ${finalWidth}x${finalHeight}px`);
              }

              // Definir width e height para controlar o tamanho
              attributes.width = String(finalWidth);
              if (finalHeight) {
                attributes.height = String(finalHeight);
              }

              // Adicionar classe para identificar imagens de conteúdo
              attributes.class = 'content-image';

              console.log('Atributos finais aplicados:', attributes);
              console.log('=== FIM ===\n');

            } catch (error) {
              console.error('Erro ao processar imagem:', error.message);
              // Se falhar, definir largura padrão menor
              attributes.width = '180';
              attributes.class = 'content-image';
            }

            return attributes;
          });
        }),
        // Não usar styleMap customizado - deixar Mammoth usar padrão
        // Mammoth já converte bold/italic automaticamente
        ignoreEmptyParagraphs: false
      });
      const rawResult = await mammoth.extractRawText({ path: filePath });
      text = rawResult.value;
      htmlContent = htmlResult.value;

      console.log('HTML convertido, preservando dimensões originais das imagens');
      console.log('Tags <strong> encontradas:', (htmlContent.match(/<strong>/g) || []).length);
      console.log('Tags <b> encontradas:', (htmlContent.match(/<b>/g) || []).length);
      console.log('Imagens encontradas:', (htmlContent.match(/<img/g) || []).length);

      // Log das tags img para verificar se width/height estão presentes
      const imgTags = htmlContent.match(/<img[^>]+>/g) || [];
      console.log('\n=== TAGS IMG NO HTML GERADO ===');
      imgTags.forEach((tag, index) => {
        console.log(`Imagem ${index + 1}:`, tag.substring(0, 200));
      });
      console.log('=== FIM TAGS IMG ===\n');

      // Tentar extrair texto do HTML também (pode ter mais informação)
      const htmlText = htmlContent.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();

      console.log('\n=== COMPARAÇÃO TEXTO vs HTML ===');
      console.log('Tamanho texto raw:', text.length);
      console.log('Tamanho texto do HTML:', htmlText.length);
      console.log('Preview HTML (primeiros 1000 chars):');
      console.log(htmlContent.substring(0, 1000));
      console.log('=== FIM COMPARAÇÃO ===\n');

      // Se o HTML tem mais conteúdo, usar ele
      if (htmlText.length > text.length * 0.8) {
        text = htmlText;
        console.log('>>> Usando texto extraído do HTML (mais completo)');
      }
    } else if (ext === '.pdf') {
      // Processar PDF
      const fileBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(fileBuffer);
      text = pdfData.text;
      // Converter texto do PDF para HTML formatado
      htmlContent = `<div style="font-family: Calibri, Arial, sans-serif; font-size: 12pt; white-space: pre-wrap;">${text.replace(/\n/g, '<br>')}</div>`;
    } else if (ext === '.csv') {
      // Processar CSV
      const fileContent = await fs.readFile(filePath, 'utf-8');
      text = fileContent;
      // Converter CSV para tabela HTML
      htmlContent = convertCsvToHtml(fileContent);
    } else {
      throw new Error('Tipo de arquivo não suportado');
    }

    // Extrair metadados
    const metadata = extractMetadata(text, htmlContent);

    // Retornar o conteúdo completo para ser exibido
    const sections = {
      conteudoCompleto: text
    };

    return {
      sections,
      metadata,
      fullText: text,
      htmlContent: htmlContent
    };
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    throw error;
  }
}

function convertCsvToHtml(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return '<p>Arquivo CSV vazio</p>';

  let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';

  lines.forEach((line, index) => {
    const cells = line.split(',').map(cell => cell.trim());
    const tag = index === 0 ? 'th' : 'td';
    html += '<tr>';
    cells.forEach(cell => {
      html += `<${tag} style="padding: 8px; border: 1px solid #ddd;">${cell}</${tag}>`;
    });
    html += '</tr>';
  });

  html += '</table>';
  return html;
}

function extractMetadata(text, htmlContent = '') {
  const metadata = {};
  const sections = {};

  // Extrair curso
  const cursoMatch = text.match(/Curso:\s*([^\n]+)/i);
  if (cursoMatch) metadata.curso = cursoMatch[1].trim();

  // Extrair módulo
  const moduloMatch = text.match(/Módulo:\s*([^\n]+)/i);
  if (moduloMatch) metadata.modulo = moduloMatch[1].trim();

  // Extrair agenda
  const agendaMatch = text.match(/(?:Número da )?Agenda:\s*([^\n]+)/i);
  if (agendaMatch) metadata.agenda = agendaMatch[1].trim();

  // Extrair professor
  const profMatch = text.match(/Professor[^:]*:\s*([^\n]+)/i);
  if (profMatch) metadata.professor = profMatch[1].trim();

  // Extrair título
  const tituloMatch = text.match(/Título[^:]*:\s*([^\n]+)/i);
  if (tituloMatch) metadata.titulo = tituloMatch[1].trim();

  // Log do texto para debug
  console.log('\n=== TEXTO EXTRAÍDO DO DOCUMENTO (primeiros 2000 chars) ===');
  console.log(text.substring(0, 2000));
  console.log('\n=== FIM DO PREVIEW ===\n');

  // Salvar HTML completo para debug (temporário) - não bloqueante
  const debugPath = path.join(__dirname, '../debug_extracted_html.txt');
  const debugContent = `=== HTML COMPLETO ===\n\n${htmlContent}\n\n=== TEXTO EXTRAÍDO ===\n\n${text.substring(0, 3000)}`;
  fs.writeFile(debugPath, debugContent).then(() => {
    console.log(`✓ HTML e texto salvos em: ${debugPath}`);
  }).catch(err => {
    console.log('⚠️ Não foi possível salvar arquivo de debug:', err.message);
  });

  // Extrair seções pela ordem estruturada do documento (usando HTML quando disponível)
  const extractedSections = extractSectionsByOrder(text, htmlContent);
  Object.assign(sections, extractedSections);

  sections.prazos = extractPrazos(text);

  console.log('=== SEÇÕES EXTRAÍDAS ===');
  console.log(JSON.stringify(sections, null, 2));

  metadata.sections = sections;
  return metadata;
}

function extractSectionsByOrder(text, htmlContent = '') {
  const sections = {};

  console.log('\n=== INICIANDO EXTRAÇÃO INTELIGENTE DE SEÇÕES ===');
  console.log('Tamanho do texto:', text.length);
  console.log('Tamanho do HTML:', htmlContent.length);
  console.log('Preview do texto:', text.substring(0, 500));
  console.log('===\n');

  // Primeiro tentar encontrar seções específicas conhecidas
  const knownSections = extractKnownSections(text, htmlContent);
  Object.assign(sections, knownSections);

  console.log(`\n=== TOTAL DE SEÇÕES CONHECIDAS ENCONTRADAS: ${Object.keys(sections).length} ===\n`);

  // Se encontrou seções conhecidas, retornar (NÃO tentar auto-detecção)
  if (Object.keys(sections).length > 0) {
    return sections;
  }

  // Caso contrário, tentar detectar títulos automaticamente
  console.log('\n>>> Nenhuma seção padrão encontrada. Tentando detectar títulos automaticamente...\n');
  const autoSections = extractSectionsAutomatically(text, htmlContent);
  Object.assign(sections, autoSections);

  console.log(`\n=== TOTAL DE SEÇÕES AUTO-DETECTADAS: ${Object.keys(sections).length} ===\n`);
  return sections;
}

function extractKnownSections(text, htmlContent = '') {
  const sections = {};

  console.log('\n>>> NOVA ESTRATÉGIA: Dividir por imagens de ícones (seção)...');

  const sourceHTML = htmlContent || '';

  console.log(`HTML disponível: ${htmlContent ? 'SIM (' + htmlContent.length + ' chars)' : 'NÃO'}`);

  if (!sourceHTML) {
    console.log('Sem HTML disponível para processar');
    return sections;
  }

  // NOVA LÓGICA: Os ícones de seção são imagens sozinhas em parágrafos
  // Procurar por: <p><img.../></p> (parágrafo contendo APENAS imagem, sem texto)
  // Essas imagens contêm os nomes das seções como gráficos (não como texto HTML)

  // Primeiro, remover a tabela inicial (metadados)
  const tableEnd = sourceHTML.indexOf('</table>');
  const contentStart = tableEnd > 0 ? tableEnd + 8 : 0;
  const content = sourceHTML.substring(contentStart);

  console.log(`Iniciando busca após tabela (posição ${contentStart})`);

  // ABORDAGEM FINAL: Como os nomes das seções estão DENTRO das imagens (gráficos),
  // vamos simplesmente dividir o documento em PEDAÇOS GRANDES de conteúdo.
  // Procurar por imagens que tenham bastante conteúdo depois delas (indicando início de seção)

  const iconPattern = /<p[^>]*>\s*<img[^>]+>\s*<\/p>/gi;
  const potentialIcons = [];
  let match;

  while ((match = iconPattern.exec(content)) !== null) {
    potentialIcons.push({
      html: match[0],
      index: match.index
    });
  }

  console.log(`\n>>> Encontrados ${potentialIcons.length} imagens isoladas`);

  // Filtrar apenas imagens que são ícones de seção
  // Critérios:
  // 1. Tem bastante conteúdo depois (> 300 chars) OU tem imagem grande (> 200px)
  // 2. Não é a primeira imagem muito próxima do início (logo)
  const sectionIcons = [];
  for (let i = 0; i < potentialIcons.length; i++) {
    const current = potentialIcons[i];
    const next = potentialIcons[i + 1];

    const nextPos = next ? next.index : content.length;
    const contentAfter = content.substring(current.index + current.html.length, nextPos);
    const contentBefore = content.substring(0, current.index);

    // Para a primeira imagem, verificar se tem conteúdo significativo antes
    // Se for logo no início (< 200 chars antes), provavelmente é logo/decoração
    if (i === 0 && contentBefore.trim().length < 200) {
      console.log(`  ✗ Primeira imagem em posição ${current.index} - muito próxima do início (${contentBefore.length} chars antes) - provavelmente é logo`);
      continue;
    }

    // Extrair largura da imagem (se disponível)
    const widthMatch = current.html.match(/width="(\d+)"/);
    const imageWidth = widthMatch ? parseInt(widthMatch[1]) : 0;

    // Considerar como ícone de seção se:
    // - Tem conteúdo significativo depois (> 300 chars), OU
    // - É uma imagem grande (> 200px de largura) indicando ser um ícone de seção
    const hasContentAfter = contentAfter.trim().length > 300;
    const isLargeImage = imageWidth > 200;

    if (hasContentAfter || isLargeImage) {
      sectionIcons.push(current);
      console.log(`  ✓ Ícone em posição ${current.index} - conteúdo: ${contentAfter.length} chars, largura: ${imageWidth}px`);
    } else {
      console.log(`  ✗ Imagem em posição ${current.index} - conteúdo: ${contentAfter.length} chars, largura: ${imageWidth}px (muito pequeno)`);
    }
  }

  console.log(`\n>>> ${sectionIcons.length} ícones de seção identificados`);

  if (sectionIcons.length === 0) {
    console.log('Nenhuma seção encontrada - retornando conteúdo completo');
    sections['conteudo_completo'] = content.trim();
    return sections;
  }

  // Nomes padrão das seções (na ordem esperada)
  const standardSectionNames = [
    'MOMENTO DE REFLEXÃO',
    'POR QUE APRENDER?',
    'PARA COMEÇAR O ASSUNTO...',
    'MERGULHANDO NO TEMA...',
    'AMPLIANDO HORIZONTES',
    'RESUMINDO O ESTUDO',
    'ATIVIDADE'
  ];

  // Extrair seções
  for (let i = 0; i < sectionIcons.length; i++) {
    const current = sectionIcons[i];
    const next = sectionIcons[i + 1];

    // CORREÇÃO: Iniciar APÓS a imagem do ícone (não incluir o ícone)
    const sectionStart = current.index + current.html.length;
    const sectionEnd = next ? next.index : content.length;

    let sectionHTML = content.substring(sectionStart, sectionEnd).trim();

    // Limpar textos de marcação
    sectionHTML = sectionHTML.replace(/<p>\s*Fonte:\s*(autor|Autor|Freepik)\s*<\/p>/gi, '');
    sectionHTML = sectionHTML.replace(/<p>\s*Suporte:\s*Linkar\s+a\s+imagem[^<]*<\/p>/gi, '');

    // Usar nome padrão se disponível, senão tentar extrair do HTML
    let sectionTitle;
    let safeKey;

    if (i < standardSectionNames.length) {
      // Usar nome padrão
      sectionTitle = standardSectionNames[i];
      safeKey = sectionTitle.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .substring(0, 40);
    } else {
      // Tentar extrair título do HTML (para seções adicionais)
      const titleMatch = sectionHTML.match(/<strong[^>]*>([^<]{5,50})<\/strong>/i);
      sectionTitle = titleMatch ? titleMatch[1].trim() : `Seção ${i + 1}`;
      safeKey = titleMatch
        ? sectionTitle.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .substring(0, 40)
        : `secao_${i + 1}`;
    }

    const imageCount = (sectionHTML.match(/<img /g) || []).length;

    console.log(`\nSeção ${i + 1}: "${sectionTitle}"`);
    console.log(`  Key: ${safeKey}`);
    console.log(`  Tamanho: ${sectionHTML.length} chars`);
    console.log(`  Imagens: ${imageCount}`);
    console.log(`  Preview: ${sectionHTML.substring(0, 150).replace(/<[^>]+>/g, ' ')}...`);

    sections[safeKey] = sectionHTML;
    console.log(`  ✓ Adicionada`);
  }

  console.log(`\n>>> Total de seções extraídas: ${Object.keys(sections).length}`);
  console.log(`>>> Chaves: ${Object.keys(sections).join(', ')}`);

  return sections;
}

function extractTitlesFromIndex(text) {
  const titles = [];

  // Procurar por uma sequência de linhas que parecem ser títulos de seções
  // (linhas curtas, começando com maiúscula, sem pontuação final)
  const lines = text.split('\n');

  // Detectar se há um índice procurando por padrões
  let inIndex = false;
  let indexStarted = false;

  for (let i = 0; i < Math.min(lines.length, 100); i++) { // Procurar apenas nas primeiras 100 linhas
    const line = lines[i].trim();

    // Pular linhas vazias
    if (!line) continue;

    // Detectar início do índice
    if (!indexStarted && (
      /^(Momento\s+de\s+Reflexão|Por\s+que\s+Aprender)/i.test(line) ||
      line.length > 10 && line.length < 60 && /^[A-ZÁÉÍÓÚ]/.test(line) && !/[.!?]$/.test(line)
    )) {
      inIndex = true;
      indexStarted = true;
    }

    // Se estamos no índice, coletar títulos
    if (inIndex) {
      // Verificar se é um título (não muito longo, não tem pontuação final)
      if (line.length > 5 && line.length < 80 && !/[.!?:]$/.test(line) && /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(line)) {
        // Ignorar linhas que são números, datas, etc
        if (!/^\d+/.test(line) && !line.match(/\d{2}\/\d{2}\/\d{4}/)) {
          titles.push(line);
        }
      }

      // Detectar fim do índice (quando começa texto longo)
      if (line.length > 100 || /[.!?:]$/.test(line)) {
        inIndex = false;
      }
    }

    // Se já coletamos títulos suficientes, parar
    if (titles.length > 5 && !inIndex) {
      break;
    }
  }

  return titles;
}

function findEndOfIndex(text) {
  // Procurar onde termina o índice
  // Geralmente é onde começa o primeiro parágrafo longo de texto
  const lines = text.split('\n');

  for (let i = 0; i < Math.min(lines.length, 150); i++) {
    const line = lines[i].trim();

    // Detectar parágrafo longo (provavelmente começo do conteúdo)
    if (line.length > 150 && /[.!?]/.test(line)) {
      // Calcular posição no texto original
      const position = text.indexOf(line);
      return position > 0 ? position : 0;
    }
  }

  // Se não encontrou, retornar 10% do texto como fallback
  return Math.floor(text.length * 0.1);
}

function extractSectionsAutomatically(text, htmlContent = '') {
  const sections = {};

  // Primeiro tentar dividir por "Fonte: autor" que separa as seções
  const parts = text.split(/(?:Fonte:\s*autor|FONTE:\s*AUTOR)/i);
  const htmlParts = htmlContent ? htmlContent.split(/(?:Fonte:\s*autor|FONTE:\s*AUTOR)/i) : [];

  console.log(`>>> Divisão por "Fonte: autor": ${parts.length} partes encontradas`);

  if (parts.length > 1) {
    // Identificadores de seção por conteúdo característico baseado no documento real
    const sectionIdentifiers = [
      {
        key: 'momentoReflexao',
        title: 'Momento de Reflexão',
        keywords: ['tributo é o preço que pagamos pela civilização', 'imagine que você mora em um condomínio', 'oliver wendell holmes'],
        requiredMatches: 1
      },
      {
        key: 'porqueAprender',
        title: 'Por que Aprender?',
        keywords: ['administrar um condomínio envolve muito mais do que gerenciar', 'no dia a dia, um síndico ou administrador precisa', 'entender sobre impostos, taxas e contribuições'],
        requiredMatches: 1
      },
      {
        key: 'paraComeccar',
        title: 'Para Começar o Assunto',
        keywords: ['a relevância dos tributos', 'caso 1: o desafio da retenção', 'caso 2: a incidência do iptu', 'caso 3: planejamento tributário'],
        requiredMatches: 1,
        multiPart: true // Esta seção pode estar dividida em múltiplas partes
      },
      {
        key: 'mergulhando',
        title: 'Mergulhando no Tema',
        keywords: ['vamos mergulhar no tema desta agenda', 'então leia as aulas', 'noções de direito tributário'],
        requiredMatches: 1
      },
      {
        key: 'ampliandoHorizontes',
        title: 'Ampliando Horizontes',
        keywords: ['que tal aprofundarmos os temas discutidos', 'então acesse os links a seguir', 'vídeo – direito tributário'],
        requiredMatches: 1
      },
      {
        key: 'resumindo',
        title: 'Resumindo o Estudo',
        keywords: ['nesta agenda você explorou os conceitos essenciais', 'compreende que os tributos são contribuições obrigatórias', 'até a próxima agenda'],
        requiredMatches: 1
      },
      {
        key: 'atividades',
        title: 'Atividades',
        keywords: ['situação-problema', 'condomínio residencial bela vista', 'desafio:', 'você foi contratado como consultor'],
        requiredMatches: 1
      }
    ];

    console.log(`\n>>> Iniciando identificação de ${parts.length - 1} seções...\n`);

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i].trim();

      if (part.length < 50) {
        console.log(`⊗ Parte ${i} muito curta (${part.length} chars) - ignorada`);
        continue;
      }

      console.log(`\n--- Analisando parte ${i} (${part.length} chars) ---`);
      console.log(`Preview: ${part.substring(0, 150)}...`);

      // Se a parte é muito grande (>3000 chars), pode conter múltiplas seções
      // Vamos analisar TODO o texto, não apenas os primeiros 800 chars
      if (part.length > 3000) {
        console.log(`  ⚠️  Parte grande detectada - analisando texto completo`);

        // Tentar dividir em subseções
        const subParts = splitLargePart(part, sectionIdentifiers, sections);

        if (subParts.length > 0) {
          console.log(`  ✓ ${subParts.length} subseções identificadas dentro desta parte`);
          continue;
        }
      }

      // Tentar identificar a seção pelo conteúdo
      let identified = false;
      let bestMatch = { identifier: null, score: 0 };

      for (const identifier of sectionIdentifiers) {
        if (sections[identifier.key]) continue; // Já foi identificada

        // Verificar se contém palavras-chave (análise dos primeiros 800 chars)
        const partLower = part.toLowerCase().substring(0, 800);
        const matchCount = identifier.keywords.filter(kw =>
          partLower.includes(kw.toLowerCase())
        ).length;

        console.log(`  ${identifier.title}: ${matchCount}/${identifier.keywords.length} keywords (min: ${identifier.requiredMatches})`);

        if (matchCount >= identifier.requiredMatches && matchCount > bestMatch.score) {
          bestMatch = { identifier, score: matchCount };
        }
      }

      if (bestMatch.identifier) {
        // Usar HTML se disponível para preservar formatação
        const htmlPart = htmlParts[i] || part;
        sections[bestMatch.identifier.key] = htmlPart;
        console.log(`  ✓ Identificado como: ${bestMatch.identifier.title}`);
        console.log(`  Usando: ${htmlParts[i] ? 'HTML (com formatação)' : 'Texto puro'}`);
        identified = true;
      }

      // Se não identificou, criar seção genérica
      if (!identified) {
        const key = `secao_${i}`;
        const htmlPart = htmlParts[i] || part;
        sections[key] = htmlPart;
        console.log(`  → Seção genérica criada: secao_${i}`);
      }
    }
  } else {
    // Fallback: detectar títulos por formatação
    const lines = text.split('\n');
    const potentialTitles = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line || line.length > 100 || line.includes(':')) continue;

      if (line.length > 5 && line.length < 100 &&
          /^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(line) &&
          !/[.;,]$/.test(line)) {

        potentialTitles.push({
          title: line,
          lineIndex: i
        });
      }
    }

    console.log(`>>> Títulos potenciais encontrados: ${potentialTitles.length}`);

    for (let i = 0; i < potentialTitles.length; i++) {
      const currentTitle = potentialTitles[i];
      const nextTitle = potentialTitles[i + 1];

      const startLine = currentTitle.lineIndex + 1;
      const endLine = nextTitle ? nextTitle.lineIndex : lines.length;

      const content = lines.slice(startLine, endLine).join('\n').trim();

      if (content.length > 20) {
        const key = currentTitle.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');

        sections[key] = content;
        console.log(`✓ Seção auto-detectada: "${currentTitle.title}" (${content.length} chars)`);
      }
    }
  }

  return sections;
}

function splitLargePart(text, sectionIdentifiers, sections) {
  const foundSections = [];

  // Para cada seção ainda não identificada, procurar no texto completo
  for (const identifier of sectionIdentifiers) {
    if (sections[identifier.key]) continue; // Já foi identificada

    const textLower = text.toLowerCase();

    // Procurar pela primeira palavra-chave que identifica esta seção
    let sectionStart = -1;
    let matchedKeyword = null;

    for (const keyword of identifier.keywords) {
      const index = textLower.indexOf(keyword.toLowerCase());
      if (index !== -1 && (sectionStart === -1 || index < sectionStart)) {
        sectionStart = index;
        matchedKeyword = keyword;
      }
    }

    if (sectionStart !== -1) {
      foundSections.push({
        identifier,
        start: sectionStart,
        keyword: matchedKeyword
      });
    }
  }

  // Ordenar por posição no texto
  foundSections.sort((a, b) => a.start - b.start);

  // Extrair conteúdo de cada seção
  for (let i = 0; i < foundSections.length; i++) {
    const current = foundSections[i];
    const next = foundSections[i + 1];

    const start = current.start;
    const end = next ? next.start : text.length;
    const content = text.substring(start, end).trim();

    if (content.length > 50) {
      sections[current.identifier.key] = content;
      console.log(`    ✓ ${current.identifier.title} encontrado na posição ${start} (keyword: "${current.keyword}")`);
    }
  }

  return foundSections;
}

function extractPrazos(text) {
  const prazos = {};

  const prazoInicialMatch = text.match(/Prazo Inicial.*?(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/i);
  if (prazoInicialMatch) prazos.inicio = prazoInicialMatch[1].trim();

  const prazoFinalMatch = text.match(/Prazo Final.*?(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/i);
  if (prazoFinalMatch) prazos.fim = prazoFinalMatch[1].trim();

  return prazos;
}

module.exports = { parseDocx };
