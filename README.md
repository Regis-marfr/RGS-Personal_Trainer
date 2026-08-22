# 🏋️ RGS Personal Trainer — Sistema Web Serverless

Plataforma web de acompanhamento de treinos personalizados, composta por um aplicativo mobile-first para alunos e um painel de administração (CMS) exclusivo para o Personal Trainer, pronta para deploy na **Vercel** com banco de dados **PostgreSQL (Supabase)**.

---

## ⚡ Recursos Principais

- 📱 **App do Aluno (Mobile-First):** Visualização de treinos do dia, aquecimento, marcação de exercícios concluídos, adição de observações do treino e consulta de histórico.
- 👨‍🏫 **CMS do Personal Trainer:** Cadastro de alunos, anamnese, montagem flexível de treinos por dia da semana (sem limite de exercícios), biblioteca de exercícios e acompanhamento do histórico dos alunos.
- 🔐 **Segurança & Autenticação:** JWT, Bcrypt, 2FA via aplicativo autenticador (TOTP), segregação de acesso por função (`student` vs `trainer`).
- ✉️ **E-mails Transacionais:** Confirmação de cadastro e recuperação de senha via **Gmail SMTP** com templates HTML profissionais.
- ☁️ **Serverless Ready:** Configurado para execução na Vercel com banco de dados Supabase/Neon/Vercel Postgres.

---

## 📚 Documentação Técnica (`/docs`)

- 🏗️ [Arquitetura do Sistema](docs/ARCHITECTURE.md) — Visão geral, tecnologias, segurança e fluxo de dados.
- 🗄️ [Modelo do Banco de Dados](docs/DATABASE_SCHEMA.md) — Diagrama de entidades, tabelas e dados seed.
- ✉️ [Autenticação e E-mails](docs/EMAIL_AND_AUTH.md) — Configuração do Gmail SMTP, recuperação de senha e 2FA.

---

## 📋 Instruções e Guias Práticos (`/instructions`)

- 🚀 [Guia de Deploy na Vercel](instructions/VERCEL_DEPLOYMENT.md) — Passo a passo para colocar a aplicação no ar.
- 🗄️ [Configuração do Banco no Supabase](instructions/SUPABASE_SETUP.md) — Como criar o banco PostgreSQL gratuito e rodar o `schema.sql`.
- 👨‍🏫 [Guia do Usuário Personal Trainer](instructions/CMS_ADMIN_GUIDE.md) — Como utilizar o CMS para gerenciar alunos e montar treinos.
- 💻 [Desenvolvimento e Testes Locais](instructions/LOCAL_DEVELOPMENT.md) — Como rodar a aplicação em seu computador.

---

## 🔑 Credenciais Padrão do Personal Trainer (Administrador)

- **E-mail:** `trainer@rgspersonal.com.br`
- **Senha:** `RGp005511@`
- **Acesso CMS:** `/admin.html`