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

      // Salvar HTML e CSS brutos editáveis para cada seção
      for (const [key, content] of Object.entries(fullParsedData.metadata.sections)) {
        if (key === 'prazos' || !content) continue;

        const sectionHtmlPath = path.join(__dirname, '../generated', `section_${key}_${timestamp}_raw.html`);
        const sectionCssPath = path.join(__dirname, '../generated', `section_${key}_${timestamp}_raw.css`);

        // Salvar HTML puro (sem wrapper)
        await fs.writeFile(sectionHtmlPath, content);

        // Salvar CSS básico editável
        const basicCss = `/* CSS para a seção ${key} */

.content {
  font-family: Calibri, 'Open Sans', Arial, sans-serif;
  font-size: 12pt;
  line-height: 1.5;
  color: #2d3748;
}

.content p {
  margin-bottom: 18px;
  text-align: justify;
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
  display: block;
  margin: 20px auto;
  /* Tamanho original preservado via atributos width/height do HTML */
  /* NÃO usar max-width ou height para não alterar dimensões */
}`;

        await fs.writeFile(sectionCssPath, basicCss);
      }

      console.log('Arquivos HTML/CSS editáveis salvos');
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

exports.saveEditedSection = async (req, res) => {
  try {
    const { sectionKey, timestamp, htmlContent, cssContent } = req.body;

    if (!sectionKey || !timestamp || !htmlContent || !cssContent) {
      return res.status(400).json({ error: 'Parâmetros incompletos' });
    }

    const generatedDir = path.join(__dirname, '../generated');
    const sectionHtmlPath = path.join(generatedDir, `section_${sectionKey}_${timestamp}_raw.html`);
    const sectionCssPath = path.join(generatedDir, `section_${sectionKey}_${timestamp}_raw.css`);
    const fullPagePath = path.join(generatedDir, `section_${sectionKey}_${timestamp}.html`);

    // Salvar HTML editado (raw)
    await fs.writeFile(sectionHtmlPath, htmlContent);
    console.log('HTML editado salvo em:', sectionHtmlPath);

    // Salvar CSS editado (raw)
    await fs.writeFile(sectionCssPath, cssContent);
    console.log('CSS editado salvo em:', sectionCssPath);

    // Ler a página completa atual para atualizar o conteúdo
    try {
      const fullPageHTML = await fs.readFile(fullPagePath, 'utf8');

      // Substituir o conteúdo dentro da div .content
      const updatedPage = fullPageHTML.replace(
        /(<div class="content">)([\s\S]*?)(<\/div>\s*<\/div>\s*<div class="actions">)/,
        `$1\n                ${htmlContent}\n            $3`
      );

      // Salvar a página completa atualizada
      await fs.writeFile(fullPagePath, updatedPage);
      console.log('Página completa atualizada em:', fullPagePath);
    } catch (pageError) {
      console.error('Erro ao atualizar página completa:', pageError);
      // Não falhar se não conseguir atualizar a página completa
    }

    res.json({
      message: 'Alterações salvas com sucesso',
      files: {
        html: sectionHtmlPath,
        css: sectionCssPath,
        fullPage: fullPagePath
      }
    });
  } catch (error) {
    console.error('Erro ao salvar alterações:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Erro ao salvar alterações: ' + error.message });
  }
};
