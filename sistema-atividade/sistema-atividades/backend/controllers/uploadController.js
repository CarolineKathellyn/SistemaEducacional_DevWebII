const fs = require('fs').promises;
const path = require('path');
const { parseDocx } = require('../utils/docxParser');

// Armazenar arquivos processados temporariamente
const processedFiles = new Map();

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const filePath = req.file.path;
    const fileId = req.file.filename;

    console.log('Processando arquivo:', filePath);

    // Parse do documento
    const parsedData = await parseDocx(filePath);

    console.log('Arquivo processado com sucesso');

    // Armazenar o parsedData completo no servidor
    processedFiles.set(fileId, parsedData);

    // Enviar apenas metadados e referência para o frontend
    res.json({
      message: 'Arquivo processado com sucesso',
      data: {
        metadata: parsedData.metadata,
        sections: parsedData.sections,
        fileId: fileId  // Usar fileId em vez de enviar todo o conteúdo
      },
      filename: fileId
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    console.error('Stack completo:', error.stack);
    res.status(500).json({ error: 'Erro ao processar arquivo: ' + error.message });
  }
};

exports.generateActivityHTML = async (req, res) => {
  try {
    const { parsedData, activityInfo } = req.body;
    let fullParsedData = parsedData;

    // Se tiver fileId, recuperar os dados completos do servidor
    if (parsedData.fileId && processedFiles.has(parsedData.fileId)) {
      fullParsedData = processedFiles.get(parsedData.fileId);
      console.log('Usando dados completos do arquivo:', parsedData.fileId);
    } else {
      console.log('Usando dados do request (pode estar incompleto)');
    }

    const { generateHTML, generateSectionPages } = require('../utils/htmlGenerator');

    const timestamp = Date.now();

    // Gerar HTML principal (menu de navegação)
    const html = await generateHTML(fullParsedData, activityInfo, timestamp);

    console.log('HTML gerado, tamanho:', html.length);

    const filename = `activity_${timestamp}.html`;
    const outputPath = path.join(__dirname, '../generated', filename);

    await fs.writeFile(outputPath, html);

    console.log('Arquivo salvo em:', outputPath);

    // Gerar páginas individuais para cada seção
    if (fullParsedData.metadata && fullParsedData.metadata.sections) {
      const sectionFiles = await generateSectionPages(
        fullParsedData.metadata.sections,
        activityInfo,
        timestamp,
        path.join(__dirname, '../generated')
      );
      console.log('Arquivos de seção gerados:', sectionFiles.length);
    }

    // Limpar arquivo processado da memória após gerar HTML
    if (parsedData.fileId) {
      processedFiles.delete(parsedData.fileId);
    }

    res.json({
      message: 'HTML gerado com sucesso',
      htmlPath: `/generated/${filename}`
    });
  } catch (error) {
    console.error('Erro ao gerar HTML:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Erro ao gerar HTML: ' + error.message });
  }
};
