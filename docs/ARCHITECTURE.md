# 🏗️ Arquitetura do Sistema — RGS Personal Trainer

O **RGS Personal Trainer** é uma plataforma web completa para acompanhamento de treinos personalizados, composta por um aplicativo mobile-first para o aluno e um painel de administração (CMS) exclusivo para o Personal Trainer.

---

## 📐 Visão Geral da Arquitetura

```
  ┌───────────────────────┐            ┌───────────────────────┐
  │   App do Aluno (UI)   │            │   CMS Personal (UI)   │
  │     (index.html)      │            │     (admin.html)      │
  └───────────┬───────────┘            └───────────┬───────────┘
              │                                    │
              └──────────────────┬─────────────────┘
                                 │ HTTP / REST API (JWT)
                                 ▼
                     ┌───────────────────────┐
                     │ Serverless Node/Express│
                     │    (api/index.js)     │
                     └───────────┬───────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                               ▼
     ┌──────────────────────┐       ┌──────────────────────┐
     │  PostgreSQL Database │       │  Gmail SMTP Service  │
     │ (Supabase / Vercel)  │       │  (Nodemailer HTML)   │
     └──────────────────────┘       └──────────────────────┘
```

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **HTML5 & CSS3 Vanilla**: Layouts customizados responsivos com glassmorphism, temas escuros, variáveis CSS e design mobile-first.
- **JavaScript (ES6+)**: Sem frameworks pesados para garantir velocidade máxima e carregamento instantâneo.
- **Google Fonts**: Tipografia moderna (Inter / Roboto).

### Backend
- **Node.js + Express**: Servidor serverless estruturado para execução na Vercel (`api/index.js`).
- **Autenticação**: JSON Web Tokens (JWT), Bcrypt para hash de senhas e Speakeasy para 2FA (TOTP).
- **E-mails Transacionais**: Nodemailer via Gmail SMTP com templates HTML estilizados.

### Banco de Dados
- **PostgreSQL**: Gerenciado via `pg` (node-postgres), compatível com Supabase, Neon e Vercel Postgres.

---

## 🔐 Segurança e Autenticação

1. **Segregação Rigorosa de Roles**:
   - `student`: Acesso apenas ao App do Aluno (`index.html`).
   - `trainer`: Acesso ao CMS Administrativo (`admin.html`). Tentativas de login de aluno no CMS são bloqueadas.
2. **Confirmação de E-mail**:
   - Novos alunos recebem um código numérico de 6 dígitos via e-mail para ativar a conta.
3. **Recuperação de Senha**:
   - Código temporário de 6 dígitos enviado por e-mail com validade de 15 minutos.
4. **2FA (Autenticação em Duas Etapas)**:
   - Suporte a aplicativos autenticadores (Google Authenticator, Authy, Microsoft Authenticator) via TOTP.

---

## 📁 Estrutura de Pastas do Projeto

```
RGS-Personal_Trainer/
├── api/
│   └── index.js              # Serverless API Express (Rotas, Auth, Treinos, Histórico)
├── assets/
│   ├── css/
│   │   ├── style.css         # Estilos principais do App do Aluno
│   │   └── admin.css         # Estilos exclusivos do CMS Administrativo
│   └── script/
│       ├── app.js            # Lógica do App do Aluno (Perfil, Treinos, Histórico, 2FA)
│       └── admin.js          # Lógica do CMS (Gestão de Alunos, Criação de Treinos, Exercícios)
├── database/
│   └── schema.sql            # Estrutura do PostgreSQL com Tabela + Seeds
├── docs/                     # Documentação Técnica do Sistema
│   ├── ARCHITECTURE.md       # Arquitetura do Sistema
│   ├── DATABASE_SCHEMA.md    # Estrutura do Banco de Dados
│   └── EMAIL_AND_AUTH.md     # Configuração de E-mail e Autenticação
├── instructions/             # Instruções Práticas e Guias
│   ├── VERCEL_DEPLOYMENT.md  # Deploy na Vercel
│   ├── SUPABASE_SETUP.md     # Configuração do Banco Supabase
│   ├── CMS_ADMIN_GUIDE.md    # Guia do Usuário Personal Trainer
│   └── LOCAL_DEVELOPMENT.md  # Execução e Testes Locais
├── index.html                # Interface do Aluno
├── admin.html                # Interface do Personal Trainer
├── vercel.json               # Configuração de rotas da Vercel
├── package.json              # Dependências do Node.js
└── .env.example              # Modelo de Variáveis de Ambiente
```
