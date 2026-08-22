# 💻 Guia de Desenvolvimento e Execução Local

Este guia explica como rodar a aplicação **RGS Personal Trainer** em seu ambiente local para desenvolvimento ou testes.

---

## 🛠️ Pré-requisitos

- **Node.js**: Versão 18 ou superior instalada.
- **npm**: Instalado juntamente com o Node.js.

---

## 🚀 Como Rodar a Aplicação Localmente

### 1. Clonar ou Acessar a Pasta do Projeto
```bash
cd c:\inetpub\wwwroot\RGS-Personal_Trainer
```

### 2. Configurar o Arquivo `.env`
Crie um arquivo chamado `.env` na raiz do projeto (ou copie do `.env.example`):

```env
POSTGRES_URL=postgresql://postgres:SuaSenha@db.xxx.supabase.co:5432/postgres
JWT_SECRET=sua_chave_secreta_local
GMAIL_USER=regimarfr@gmail.com
GMAIL_APP_PASS=micnitugytxogfgf
PORT=3000
```

### 3. Instalar Dependências (se ainda não instaladas)
```bash
npm install
```

### 4. Iniciar o Servidor Local
```bash
npm start
```
ou
```bash
node api/index.js
```

O servidor iniciará na URL: `http://localhost:3000`

---

## 🌐 Endpoints Locais

- **App do Aluno:** `http://localhost:3000/index.html`
- **CMS do Personal Trainer:** `http://localhost:3000/admin.html`
- **Healthcheck:** `http://localhost:3000/api/health`

---

## 🧪 Testando as Funcionalidades

1. **Login do Personal Trainer:**
   - Acesse `http://localhost:3000/admin.html`
   - E-mail: `trainer@rgspersonal.com.br`
   - Senha: `RGp005511@`

2. **Cadastro e Login de Aluno:**
   - Acesse `http://localhost:3000/index.html`
   - Clique em **"Cadastre-se"**
   - Informe Nome, Sobrenome, E-mail e Senha.
   - Digite o código enviado para o seu e-mail do Gmail.
   - Preencha a ficha de anamnese no primeiro acesso.
