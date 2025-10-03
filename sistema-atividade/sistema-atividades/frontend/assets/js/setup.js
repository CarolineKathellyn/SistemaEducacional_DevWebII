const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Criar estrutura de pastas
const folders = [
    'backend/uploads',
    'backend/generated',
    'database'
];

console.log('📁 Criando estrutura de pastas...');
folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`✓ Pasta criada: ${folder}`);
    }
});

// Criar arquivo .gitkeep
['backend/uploads', 'backend/generated'].forEach(folder => {
    fs.writeFileSync(path.join(folder, '.gitkeep'), '');
});

console.log('\n✅ Setup concluído com sucesso!');
console.log('\nPróximos passos:');
console.log('1. cd sistema-atividades');
console.log('2. npm install (no diretório raiz)');
console.log('3. cd backend && npm install');
console.log('4. npm run dev (para iniciar o servidor)');
console.log('\nAcesse: http://localhost:3000');
console.log('\n👨‍🏫 Professor: professor@sistema.com / admin123');
console.log('👨‍🎓 Aluno: aluno@sistema.com / aluno123');