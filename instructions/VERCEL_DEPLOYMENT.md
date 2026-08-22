# 🚀 Guia Completo de Deploy na Vercel

Este guia descreve passo a passo como publicar a aplicação **RGS Personal Trainer** na **Vercel** com banco de dados **Supabase**.

---

## 🛠️ Pré-requisitos

1. Uma conta na [Vercel](https://vercel.com).
2. O banco de dados PostgreSQL criado no Supabase (veja `instructions/SUPABASE_SETUP.md`).
3. Seu código enviado para um repositório no **GitHub** ou **GitLab**.

---

## 📋 Passo a Passo para o Deploy

### Passo 1: Importar o Projeto na Vercel

1. Acesse o painel da Vercel: [vercel.com/dashboard](https://vercel.com/dashboard).
2. Clique no botão **"Add New..."** → **"Project"**.
3. Selecione o repositório `RGS-Personal_Trainer` do seu GitHub.
4. Em **Framework Preset**, selecione **"Other"**.
5. Mantenha o **Root Directory** como `./` (raiz do projeto).

---

### Passo 2: Configurar Variáveis de Ambiente

Antes de clicar em **Deploy**, abra a seção **Environment Variables** e adicione as 4 variáveis abaixo:

| Nome da Variável | Valor | Exemplo |
|---|---|---|
| `POSTGRES_URL` | URL de Conexão do Supabase | `postgresql://postgres.xxx:SuaSenha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | Chave secreta de autenticação | `rgs_personal_trainer_jwt_secret_key_2026_prod_9988` |
| `GMAIL_USER` | E-mail remetente | `regimarfr@gmail.com` |
| `GMAIL_APP_PASS` | Senha de App do Gmail | `micnitugytxogfgf` |

> [!IMPORTANT]
> **Atenção sobre a `POSTGRES_URL`:** Use a URL do **Connection Pooling (Session Mode)** na porta `5432` fornecida no painel do Supabase.

---

### Passo 3: Concluir o Deploy

1. Clique em **"Deploy"**.
2. Aguarde cerca de 1 a 2 minutos enquanto a Vercel compila o projeto estático e cria a função Serverless da API.
3. Quando finalizar, você receberá um link no formato:
   `https://rgs-personal-trainer.vercel.app`

---

## 🌐 URLs de Acesso Após o Deploy

- **App do Aluno:** `https://rgs-personal-trainer.vercel.app/`
- **CMS do Personal Trainer:** `https://rgs-personal-trainer.vercel.app/admin.html`
- **Healthcheck da API:** `https://rgs-personal-trainer.vercel.app/api/health`

---

## 🔒 Credenciais de Acesso Inicial ao CMS

- **E-mail:** `trainer@rgspersonal.com.br`
- **Senha:** `RGp005511@`

---

## ⚠️ Verificações Pós-Deploy

1. Acesse o CMS pelo link `/admin.html` e faça login com a conta do trainer.
2. Cadastre um novo aluno de teste ou crie um treino.
3. No celular, acesse a raiz `/` e faça um novo cadastro de aluno para testar o recebimento do e-mail de confirmação.
