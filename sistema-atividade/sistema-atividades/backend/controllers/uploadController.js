const fs = require('fs').promises;
const path = require('path');
const { parseDocx } = require('../utils/docxParser');
const { generateHTML } = require('../utils/htmlGenerator');

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const filePath = req.file.path;
    
    // Parse do documento
    const parsedData = await parseDocx(filePath);
    
    res.json({
      message: 'Arquivo processado com sucesso',
      data: parsedData,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro ao processar arquivo' });
  }
};

exports.generateActivityHTML = async (req, res) => {
  try {
    const { parsedData, activityInfo } = req.body;
    
    const html = await generateHTML(parsedData, activityInfo);
    
    const filename = `activity_${Date.now()}.html`;
    const outputPath = path.join(__dirname, '../generated', filename);
    
    await fs.writeFile(outputPath, html);
    
    res.json({
      message: 'HTML gerado com sucesso',
      htmlPath: `/generated/${filename}`
    });
  } catch (error) {
    console.error('Erro ao gerar HTML:', error);
    res.status(500).json({ error: 'Erro ao gerar HTML' });
  }
};
