# 🗄️ Guia de Configuração do Banco de Dados no Supabase

Este guia orienta como criar um banco de dados gratuito no **Supabase** e executar a estrutura de tabelas do **RGS Personal Trainer**.

---

## 🚀 Passo 1: Criar o Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login (ou crie uma conta gratuita com GitHub).
2. Clique em **"New Project"**.
3. Preencha os dados:
   - **Name:** `rgs-personal-db`
   - **Database Password:** Escolha uma senha forte e **guarde-a bem**.
   - **Region:** Selecione `South America (São Paulo)` para menor latência no Brasil.
4. Clique em **"Create new project"** e aguarde cerca de 2 minutos até o banco ficar pronto.

---

## 📜 Passo 2: Executar o Script SQL (`schema.sql`)

1. No menu lateral do Supabase, clique no ícone **SQL Editor** (`>_`).
2. Clique em **"New query"**.
3. Abra o arquivo `database/schema.sql` do projeto.
4. Copie todo o conteúdo do arquivo `schema.sql` e cole no editor do Supabase.
5. Clique no botão **"Run"** (no canto inferior direito) ou pressione `Ctrl + Enter`.
6. Você deverá ver a mensagem: `Success. No rows returned`.

---

## 🔗 Passo 3: Obter a URL de Conexão (`POSTGRES_URL`)

1. No menu lateral do Supabase, vá em **Project Settings** (ícone de engrenagem ⚙️).
2. Clique na aba **Database**.
3. Na seção **Connection String**, selecione a aba **URI**.
4. Copie a URL gerada. Ela terá o formato:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxx.supabase.co:5432/postgres
   ```
5. Substitua `[YOUR-PASSWORD]` pela senha do banco de dados que você definiu no Passo 1.
6. Essa é a URL que você deve usar na variável de ambiente `POSTGRES_URL` na Vercel ou no arquivo `.env` local.
