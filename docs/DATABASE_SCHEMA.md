# 🗄️ Estrutura do Banco de Dados — RGS Personal Trainer

O banco de dados do sistema utiliza **PostgreSQL** e está configurado para ser executado no **Supabase** (ou Neon / Vercel Postgres).

---

## 📊 Diagrama de Entidades (DER)

```
┌─────────────────────────┐       ┌─────────────────────────┐
│          users          │1   1  │    student_anamnese     │
├─────────────────────────┼───────┼─────────────────────────┤
│ id (PK)                 │       │ id (PK)                 │
│ name, email, role       │       │ user_id (FK)            │
│ password_hash, is_active│       │ age, weight, height     │
│ is_verified, photo_url  │       │ goal, medical_history   │
└───────────┬─────────────┘       └─────────────────────────┘
            │ 1
            │
            ├─────────────────────┐
            │ 1                   │ 1
            ▼                     ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│        workouts         │ │     workout_history     │
├─────────────────────────┼─┤─────────────────────────┤
│ id (PK)                 │ │ id (PK)                 │
│ student_id (FK)         │ │ user_id (FK)            │
│ day_code (SEG..SAB)     │ │ day_code, workout_title │
│ title, warmup_info      │ │ trained_at, notes       │
└───────────┬─────────────┘ │ exercises_data (JSONB)  │
            │ 1             └─────────────────────────┘
            │
            ▼ N
┌─────────────────────────┐
│    workout_exercises    │
├─────────────────────────┤
│ id (PK)                 │
│ workout_id (FK)         │
│ exercise_name           │
│ sets_reps, load_pred.   │
│ type_tag, order_index   │
└─────────────────────────┘
```

---

## 📋 Tabelas em Detalhes

### 1. `users` (Usuários e Autenticação)
Armazena alunos e o Personal Trainer.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL (PK) | Identificador único |
| `name` | VARCHAR(100) | Nome completo do usuário |
| `email` | VARCHAR(150) | E-mail único para login |
| `password_hash` | VARCHAR(255) | Hash bcrypt da senha |
| `role` | VARCHAR(20) | `student` ou `trainer` |
| `is_active` | BOOLEAN | `true` = ativo, `false` = bloqueado |
| `is_verified` | BOOLEAN | `true` = e-mail confirmado |
| `verification_code` | VARCHAR(10) | Código de confirmação de cadastro |
| `reset_code` | VARCHAR(10) | Código para redefinição de senha |
| `reset_expires` | TIMESTAMP | Expiração do código de reset |
| `photo_url` | TEXT | URL da foto do perfil/avatar |
| `totp_secret` | VARCHAR(100) | Chave secreta do 2FA |
| `totp_enabled` | BOOLEAN | `true` se 2FA estiver ativado |

---

### 2. `student_anamnese` (Ficha do Aluno)
Contém os dados físicos e objetivos preenchidos pelo aluno no primeiro acesso.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL (PK) | Identificador |
| `user_id` | INTEGER (FK) | Vínculo com `users.id` |
| `age` | INTEGER | Idade |
| `weight` | NUMERIC(5,2) | Peso (kg) |
| `height` | NUMERIC(5,2) | Altura (m) |
| `goal` | TEXT | Objetivo (Ex: Hipertrofia + Definição) |
| `medical_history` | TEXT | Histórico médico e lesões |
| `activity_level` | VARCHAR(50) | Nível de atividade física |

---

### 3. `trainer_profile` (Perfil do Personal Trainer)
Informações públicas do Personal que aparecem nos treinos dos alunos.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL (PK) | Identificador |
| `user_id` | INTEGER (FK) | Vínculo com `users.id` |
| `display_name` | VARCHAR(100) | Nome de exibição (Ex: Regis Personal) |
| `title` | VARCHAR(100) | Título (Ex: REGIS · PERSONAL TRAINER) |
| `bio` | TEXT | Descrição e qualificações |
| `photo_url` | TEXT | Foto da marca / avatar do Personal |

---

### 4. `exercises` (Biblioteca de Exercícios)
Cadastro centralizado de exercícios reutilizáveis no CMS.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL (PK) | Identificador |
| `name` | VARCHAR(150) | Nome do exercício |
| `category` | VARCHAR(50) | Grupo muscular (QUADRÍCEPS, GLÚTEO, etc.) |
| `default_sets_reps` | VARCHAR(50) | Séries e repetições padrão |
| `default_load` | VARCHAR(50) | Carga padrão recomendada |

---

### 5. `workouts` (Rotina Semanal do Aluno)
Define o treino atribuído pelo Personal Trainer para cada dia da semana.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL (PK) | Identificador |
| `student_id` | INTEGER (FK) | Aluno dono do treino |
| `day_code` | VARCHAR(5) | `SEG`, `TER`, `QUA`, `QUI`, `SEX`, `SAB`, `DOM` |
| `title` | VARCHAR(150) | Nome do treino do dia (Ex: QUADRÍCEPS) |
| `warmup_info` | TEXT | Instruções de aquecimento e mobilidade |

---

### 6. `workout_exercises` (Exercícios da Rotina)
Exercícios específicos vinculados a um dia de treino.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL (PK) | Identificador |
| `workout_id` | INTEGER (FK) | Vínculo com `workouts.id` |
| `exercise_name` | VARCHAR(150) | Nome do exercício |
| `sets_reps` | VARCHAR(50) | Séries × Repetições (Ex: 3 × 12–15) |
| `load_prediction` | VARCHAR(50) | Carga prevista (Ex: 40–50 kg) |
| `type_tag` | VARCHAR(50) | Tag especial (Ex: SUPERSET) |
| `order_index` | INTEGER | Ordem de exibição |

---

### 7. `workout_history` (Histórico de Treinos Concluídos)
Registros gravados pelo aluno ao finalizar um treino.

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | SERIAL (PK) | Identificador |
| `user_id` | INTEGER (FK) | Aluno que treinou |
| `day_code` | VARCHAR(5) | Dia da semana |
| `workout_title` | VARCHAR(150) | Nome do treino concluído |
| `trained_at` | DATE | Data de realização |
| `exercises_data` | JSONB | Dados detalhados dos exercícios concluídos |
| `notes` | TEXT | Anotações e observações do aluno |

---

## 🔑 Conta Administrador Padrão (Seed)

| Campo | Valor |
|---|---|
| **Nome** | Regis Personal |
| **E-mail** | `trainer@rgspersonal.com.br` |
| **Senha** | `RGp005511@` |
| **Role** | `trainer` |
