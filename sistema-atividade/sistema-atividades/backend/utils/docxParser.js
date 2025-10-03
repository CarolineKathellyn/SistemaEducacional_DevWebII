const mammoth = require('mammoth');
const fs = require('fs').promises;

async function parseDocx(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    // Extrair informações do documento
    const sections = {
      apresentacao: extractSection(text, 'Apresentação', 'Momento de reflexão'),
      momentoReflexao: extractSection(text, 'Momento de reflexão', 'Por que Aprender'),
      porqueAprender: extractSection(text, 'Por que Aprender', 'Para começar o assunto'),
      paraComecar: extractSection(text, 'Para começar o assunto', 'Mergulhando no tema'),
      mergulhandoTema: extractSection(text, 'Mergulhando no tema', 'Videoaulas'),
      videoaulas: extractSection(text, 'Videoaulas', 'Ampliando Horizontes'),
      ampliandoHorizontes: extractSection(text, 'Ampliando Horizontes', 'Resumindo o Estudo'),
      resumindoEstudo: extractSection(text, 'Resumindo o Estudo', 'Atividades'),
      atividades: extractSection(text, 'Atividades', 'Fichário'),
      fichario: extractSection(text, 'Fichário', 'Mediateca'),
      mediateca: extractSection(text, 'Mediateca', 'Fale com o seu Tutor'),
      faleComTutor: extractSection(text, 'Fale com o seu Tutor', null)
    };

    // Extrair metadados
    const metadata = extractMetadata(text);

    return {
      sections,
      metadata,
      fullText: text
    };
  } catch (error) {
    console.error('Erro ao processar arquivo:', error);
    throw error;
  }
}

function extractSection(text, startMarker, endMarker) {
  const startIndex = text.indexOf(startMarker);
  if (startIndex === -1) return '';

  if (endMarker) {
    const endIndex = text.indexOf(endMarker, startIndex);
    if (endIndex === -1) return text.substring(startIndex);
    return text.substring(startIndex, endIndex).trim();
  }
  
  return text.substring(startIndex).trim();
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
  const agendaMatch = text.match(/Agenda:\s*([^\n]+)/i);
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