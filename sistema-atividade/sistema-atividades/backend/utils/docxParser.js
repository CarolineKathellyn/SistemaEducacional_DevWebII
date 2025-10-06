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
  console.log('=== TEXTO EXTRAÍDO DO DOCUMENTO ===');
  console.log(text.substring(0, 800));
  console.log('=== FIM DO PREVIEW ===');

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

  // Dividir por "Fonte: autor" para separar seções
  const parts = text.split(/Fonte:\s*autor/i);

  console.log(`Total de partes encontradas: ${parts.length}`);

  // Ordem das seções conforme aparecem no documento
  const sectionKeys = [
    'apresentacao',
    'momentoReflexao',
    'porqueAprender',
    'paraComeccar',
    'mergulhando',
    'videoaulas',
    'ampliandoHorizontes',
    'resumindo',
    'atividades',
    'fichario',
    'midiateca',
    'faleComTutor'
  ];

  const sectionNames = {
    'apresentacao': 'Apresentação',
    'momentoReflexao': 'Momento de reflexão',
    'porqueAprender': 'Por que Aprender',
    'paraComeccar': 'Para começar o assunto',
    'mergulhando': 'Mergulhando no tema',
    'videoaulas': 'Videoaulas',
    'ampliandoHorizontes': 'Ampliando Horizontes',
    'resumindo': 'Resumindo o Estudo',
    'atividades': 'Atividades',
    'fichario': 'Fichário',
    'midiateca': 'Midiateca',
    'faleComTutor': 'Fale com o seu Tutor'
  };

  // Cada parte entre "Fonte: autor" é uma seção
  let sectionIndex = 0;

  for (let i = 0; i < parts.length && sectionIndex < sectionKeys.length; i++) {
    const part = parts[i].trim();

    // Pular partes muito curtas (provavelmente vazias)
    if (part.length < 20) continue;

    const key = sectionKeys[sectionIndex];
    sections[key] = part;

    console.log(`✓ ${sectionNames[key]}: ${part.substring(0, 80)}...`);
    sectionIndex++;
  }

  // Se ainda tiver texto sobrando sem "Fonte: autor", tentar dividir por parágrafos grandes
  if (sectionIndex < sectionKeys.length) {
    const remainingText = parts[parts.length - 1];
    const paragraphs = remainingText.split(/\n\n+/).filter(p => p.trim().length > 50);

    for (let i = 0; i < paragraphs.length && sectionIndex < sectionKeys.length; i++) {
      const key = sectionKeys[sectionIndex];
      sections[key] = paragraphs[i].trim();
      console.log(`→ ${sectionNames[key]}: ${paragraphs[i].substring(0, 80)}...`);
      sectionIndex++;
    }
  }

  return sections;
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
