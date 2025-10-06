# Sistema de Atividades Educacionais

Sistema para gerenciamento de atividades com upload de documentos Word (.docx), geração automática de HTML e controle de prazos.

## Índice

- [Instalação](#instalação)
- [Como Executar](#como-executar)
- [Como Testar](#como-testar)
- [Solução de Problemas](#solução-de-problemas)

## Características

- Upload de arquivos .docx com processamento automático
- Geração de HTML com fonte Calibri 12pt
- Controle de prazos (início/fim) com bloqueio automático
- Interface Professor: criar, editar, deletar atividades
- Interface Aluno: visualizar e responder atividades
- Sistema de login (JWT)

## Instalação

**Pré-requisito:** Node.js instalado

### 1. Instale as dependências

```bash
cd sistema-atividades/backend
npm install
```

### 2. Configure o ambiente

Crie o arquivo `.env` na raiz do projeto:

```env
PORT=3000
JWT_SECRET=seu_secret_key_aqui
NODE_ENV=development
```

### 3. Crie as pastas necessárias

```bash
mkdir -p backend/uploads backend/generated database
```

### 4. Inicialize o banco de dados

```bash
npm run init-db
```

Você verá as credenciais de acesso.

## Como Executar

```bash
cd backend
npm run dev
```

Acesse: **http://localhost:3000**

## Como Testar

### Credenciais

**Professor:**
- Email: `professor@sistema.com`
- Senha: `admin123`

**Aluno:**
- Email: `aluno@sistema.com`
- Senha: `aluno123`

### Fluxo de Teste Rápido

#### 1. Como Professor

1. Faça login como professor
2. Clique em **"Nova Atividade"**
3. Faça upload de um arquivo .docx (veja estrutura abaixo)
4. Clique em **"Processar Arquivo"**
5. Configure datas de início e fim
6. Clique em **"Criar Atividade"**

**Estrutura mínima do arquivo .docx:**

```
Curso: Nome do Curso
Módulo: I
Agenda: 01
Professor Responsável: Seu Nome
Título da agenda: Título da Aula

Apresentação
Texto da apresentação...

Momento de reflexão
Perguntas para reflexão...

Por que Aprender?
Justificativa...

Para começar o assunto
Introdução ao tema...

Mergulhando no tema
Conteúdo principal...

Videoaulas
Links de vídeos...

Ampliando Horizontes
Materiais complementares...

Resumindo o Estudo
Resumo da aula...

Atividades
Descrição das atividades...

Fichário
Material de apoio...

Mediateca
Recursos multimídia...

Fale com o seu Tutor
Informações de contato...
```

#### 2. Como Aluno

1. Faça logout
2. Login como aluno
3. Veja a atividade criada
4. Clique no card da atividade
5. Leia o conteúdo no modal
6. Digite uma resposta no campo de texto
7. Clique em **"Enviar Atividade"**

#### 3. Teste de Prazo

- Atividade **dentro do prazo**: badge verde "✓ Aberta" → aluno pode enviar
- Atividade **vencida**: badge vermelho "✕ Encerrada" → envio bloqueado

## Solução de Problemas

### Erro: "Credenciais inválidas"

```bash
rm database/sistema.db
cd backend
npm run init-db
npm run dev
```

### Erro: "Cannot find module"

```bash
cd backend
npm install
```

### Erro: Porta 3000 em uso

Edite `.env` e mude para `PORT=3001`

### Erro: Upload não funciona

```bash
mkdir -p backend/uploads backend/generated
```

### Reset Completo

```bash
rm -rf node_modules database/sistema.db backend/uploads/* backend/generated/*
cd backend
npm install
npm run init-db
npm run dev
```

---

**Versão 1.0.0** | Fonte: Calibri 12pt | Tecnologias: Node.js, Express, SQLite