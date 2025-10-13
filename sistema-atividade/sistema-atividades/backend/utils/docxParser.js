const mammoth = require('mammoth');
const fs = require('fs').promises;
const path = require('path');
const { pdf: pdfParse } = require('pdf-parse');

async function parseDocx(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();

    let text = '';
    let htmlContent = '';

    // Processar conforme tipo de arquivo
    if (ext === '.docx' || ext === '.doc') {
      // Processar Word
      const htmlResult = await mammoth.convertToHtml({ path: filePath });
      const rawResult = await mammoth.extractRawText({ path: filePath });
      text = rawResult.value;
      htmlContent = htmlResult.value;

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
    const metadata = extractMetadata(text);

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

function extractMetadata(text) {
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

  // Salvar texto completo para debug (temporário) - não bloqueante
  const debugPath = path.join(__dirname, '../debug_extracted_text.txt');
  fs.writeFile(debugPath, text).then(() => {
    console.log(`✓ Texto completo salvo em: ${debugPath}`);
  }).catch(err => {
    console.log('⚠️ Não foi possível salvar arquivo de debug:', err.message);
  });

  // Extrair seções pela ordem estruturada do documento
  const extractedSections = extractSectionsByOrder(text);
  Object.assign(sections, extractedSections);

  sections.prazos = extractPrazos(text);

  console.log('=== SEÇÕES EXTRAÍDAS ===');
  console.log(JSON.stringify(sections, null, 2));

  metadata.sections = sections;
  return metadata;
}

function extractSectionsByOrder(text) {
  const sections = {};

  console.log('\n=== INICIANDO EXTRAÇÃO INTELIGENTE DE SEÇÕES ===');
  console.log('Tamanho do texto:', text.length);
  console.log('Preview do texto:', text.substring(0, 500));
  console.log('===\n');

  // Primeiro tentar encontrar seções específicas conhecidas
  const knownSections = extractKnownSections(text);
  Object.assign(sections, knownSections);

  console.log(`\n=== TOTAL DE SEÇÕES CONHECIDAS ENCONTRADAS: ${Object.keys(sections).length} ===\n`);

  // Se encontrou seções conhecidas, retornar (NÃO tentar auto-detecção)
  if (Object.keys(sections).length > 0) {
    return sections;
  }

  // Caso contrário, tentar detectar títulos automaticamente
  console.log('\n>>> Nenhuma seção padrão encontrada. Tentando detectar títulos automaticamente...\n');
  const autoSections = extractSectionsAutomatically(text);
  Object.assign(sections, autoSections);

  console.log(`\n=== TOTAL DE SEÇÕES AUTO-DETECTADAS: ${Object.keys(sections).length} ===\n`);
  return sections;
}

function extractKnownSections(text) {
  const sections = {};

  console.log('\n>>> Usando estratégia de marcadores de conteúdo...');

  // Definir marcadores únicos de cada seção baseado no conteúdo real
  const sectionMarkers = [
    {
      key: 'porqueAprender',
      name: 'Por que Aprender?',
      startMarkers: [
        /Administrar\s+um\s+condom[ií]nio\s+envolve\s+muito\s+mais/i,
        /🔍\s*Vamos\s+aprender\s+mais\s+sobre\s+isso/i
      ],
      priority: 2
    },
    {
      key: 'paraComeccar',
      name: 'Para Começar o Assunto',
      startMarkers: [
        /A\s+Relev[âa]ncia\s+dos\s+Tributos\s+na\s+Administra[çc][ãa]o\s+Condominial/i,
        /Antes\s+de\s+mergulharmos\s+na\s+teoria\s+dos\s+tributos/i
      ],
      priority: 3
    },
    {
      key: 'mergulhando',
      name: 'Mergulhando no Tema',
      startMarkers: [
        /Vamos\s+mergulhar\s+no\s+tema\s+desta\s+agenda/i,
        /ent[ãa]o\s+leia\s+as\s+aulas/i
      ],
      priority: 4
    },
    {
      key: 'momentoReflexao',
      name: 'Momento de Reflexão',
      startMarkers: [
        /tributo\s+[éeè]\s+o\s+pre[çc]o\s+que\s+pagamos\s+pela\s+civiliza[çc][ãa]o/i,
        /oliver\s+wendell\s+holmes/i
      ],
      priority: 1
    },
    {
      key: 'ampliandoHorizontes',
      name: 'Ampliando Horizontes',
      startMarkers: [
        /Que\s+tal\s+aprofundarmos\s+os\s+temas\s+discutidos/i,
        /ent[ãa]o\s+acesse\s+os\s+links\s+a\s+seguir/i
      ],
      priority: 5
    },
    {
      key: 'resumindo',
      name: 'Resumindo o Estudo',
      startMarkers: [
        /Nesta\s+agenda\s+voc[êe]\s+explorou\s+os\s+conceitos\s+essenciais/i,
        /compreende\s+que\s+os\s+tributos\s+s[ãa]o\s+contribui[çc][õo]es\s+obrigat[óo]rias/i
      ],
      priority: 6
    },
    {
      key: 'atividades',
      name: 'Atividades',
      startMarkers: [
        /Situa[çc][ãa]o-problema/i,
        /Condom[ií]nio\s+Residencial\s+Bela\s+Vista/i,
        /Desafio:/i
      ],
      priority: 7
    }
  ];

  // Ordenar por prioridade
  sectionMarkers.sort((a, b) => a.priority - b.priority);

  // Encontrar todas as seções
  const foundSections = [];

  for (const marker of sectionMarkers) {
    let found = false;

    for (const startPattern of marker.startMarkers) {
      const match = startPattern.exec(text);

      if (match) {
        foundSections.push({
          key: marker.key,
          name: marker.name,
          index: match.index,
          matchLength: match[0].length
        });

        console.log(`\n>>> ENCONTRADO: "${marker.name}" na posição ${match.index}`);
        console.log(`    Marcador usado: "${match[0].substring(0, 50)}..."`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log(`\n>>> NÃO ENCONTRADO: "${marker.name}"`);
    }
  }

  // Ordenar por posição no texto
  const sectionMatches = foundSections.sort((a, b) => a.index - b.index);

  console.log(`\n>>> Ordem das seções encontradas:`);
  sectionMatches.forEach((match, idx) => {
    console.log(`    ${idx + 1}. ${match.name} (posição ${match.index})`);
  });

  // Extrair conteúdo de cada seção até o próximo título
  for (let i = 0; i < sectionMatches.length; i++) {
    const current = sectionMatches[i];
    const next = sectionMatches[i + 1];

    const startIndex = current.index + current.matchLength;
    const endIndex = next ? next.index : text.length;

    // Extrair o conteúdo da seção
    let content = text.substring(startIndex, endIndex).trim();

    // Remover "Fonte: autor" do final se existir
    content = content.replace(/\s*Fonte:\s*autor\s*$/gi, '').trim();

    console.log(`\n>>> Extraindo seção: ${current.name}`);
    console.log(`    Início: ${startIndex}, Fim: ${endIndex}`);
    console.log(`    Tamanho do conteúdo: ${content.length} caracteres`);
    console.log(`    Preview: ${content.substring(0, 150)}...`);

    if (content.length > 20) {
      sections[current.key] = content;
      console.log(`✓ ${current.name}: Adicionado com sucesso!`);
    } else {
      console.log(`✗ ${current.name}: Conteúdo muito curto (${content.length} chars), ignorado.`);
    }
  }

  console.log(`\n>>> Total de seções extraídas: ${Object.keys(sections).length}`);
  console.log(`>>> Chaves das seções: ${Object.keys(sections).join(', ')}`);

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

function extractSectionsAutomatically(text) {
  const sections = {};

  // Primeiro tentar dividir por "Fonte: autor" que separa as seções
  const parts = text.split(/(?:Fonte:\s*autor|FONTE:\s*AUTOR)/i);

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
        sections[bestMatch.identifier.key] = part;
        console.log(`  ✓ Identificado como: ${bestMatch.identifier.title}`);
        identified = true;
      }

      // Se não identificou, criar seção genérica
      if (!identified) {
        const key = `secao_${i}`;
        sections[key] = part;
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
