const mammoth = require('mammoth');
const fs = require('fs').promises;

async function parseDocx(filePath) {
  try {
    // Extrair com formatação HTML para preservar estilos
    const htmlResult = await mammoth.convertToHtml({ path: filePath });
    const rawResult = await mammoth.extractRawText({ path: filePath });
    const text = rawResult.value;
    const htmlContent = htmlResult.value;

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

function extractMetadata(text) {
  const metadata = {};

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

  return metadata;
}

module.exports = { parseDocx };
