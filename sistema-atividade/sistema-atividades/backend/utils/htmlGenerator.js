const fs = require('fs').promises;
const path = require('path');

async function generateHTML(parsedData, activityInfo) {
  const { sections, metadata } = parsedData;
  
  const html = `



    
    
    ${metadata.titulo || 'Atividade'}
    


    
        
            
                ${metadata.curso || activityInfo.curso}
                
                    Módulo: ${metadata.modulo || activityInfo.modulo}
                    Agenda: ${metadata.agenda || activityInfo.agenda}
                    Professor: ${metadata.professor || activityInfo.professor_nome}
                
            
            
                Prazo Inicial: ${formatDate(activityInfo.data_inicio)}
                Prazo Final: ${formatDate(activityInfo.data_fim)}
            
        

        
            ${generateSection('Apresentação', sections.apresentacao)}
            ${generateSection('Momento de Reflexão', sections.momentoReflexao)}
            ${generateSection('Por que Aprender?', sections.porqueAprender)}
            ${generateSection('Para Começar o Assunto', sections.paraComecar)}
            ${generateSection('Mergulhando no Tema', sections.mergulhandoTema)}
            ${generateSection('Videoaulas', sections.videoaulas)}
            ${generateSection('Ampliando Horizontes', sections.ampliandoHorizontes)}
            ${generateSection('Resumindo o Estudo', sections.resumindoEstudo)}
            ${generateSection('Atividades', sections.atividades, 'highlight')}
            ${generateSection('Fichário', sections.fichario)}
            ${generateSection('Mediateca', sections.mediateca)}
            ${generateSection('Fale com o seu Tutor', sections.faleComTutor)}
        

        
            Imprimir
            Voltar
        
    


  `;

  return html;
}

function generateSection(title, content, className = '') {
  if (!content || content.trim() === '') return '';
  
  return `
    
        ${title}
        
            ${formatContent(content)}
        
    
  `;
}

function formatContent(text) {
  // Converter quebras de linha em parágrafos
  return text
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `${p.trim()}`)
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