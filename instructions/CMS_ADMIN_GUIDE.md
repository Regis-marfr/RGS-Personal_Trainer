# 👨‍🏫 Guia do Usuário — Painel do Personal Trainer (CMS)

Este manual descreve como utilizar todas as funcionalidades do **CMS Administrativo** para gerenciar alunos, montar treinos diários e acompanhar históricos de evolução.

---

## 🔑 Acesso ao CMS

- **URL:** `http://seudominio.com/admin.html` (ou `http://localhost:3000/admin.html` localmente)
- **E-mail:** `trainer@rgspersonal.com.br`
- **Senha Inicial:** `RGp005511@`

> [!CAUTION]
> Alunos tentarem fazer login nesta URL receberão a mensagem "Acesso não autorizado". Apenas contas com perfil `trainer` têm permissão para acessar o CMS.

---

## 📱 Funcionalidades do CMS

### 1. Gestão de Alunos (Aba "Alunos")
- **Listagem de Alunos:** Exibe todos os alunos cadastrados no aplicativo.
- **Ficha Anamnese:** Clique no nome do aluno para visualizar idade, peso, altura, objetivo e histórico médico.
- **Bloqueio/Desbloqueio:** Botão para ativar ou suspender o acesso de um aluno.
- **Alteração de Senha:** Altere a senha de qualquer aluno diretamente pelo CMS se ele esquecer.
- **Histórico de Treinos:** Clique no botão "Histórico" na ficha do aluno para ver todos os treinos que ele já realizou e marcou como concluído, incluindo as observações que ele anotou.

---

### 2. Criação e Montagem de Treinos (Aba "Montar Treino")
1. **Selecione o Aluno:** Escolha o aluno na lista suspensa.
2. **Selecione o Dia da Semana:** Escolha o dia (`SEG`, `TER`, `QUA`, `QUI`, `SEX`, `SAB`, `DOM`).
3. **Título do Treino:** Defina o nome do treino do dia (Ex: `QUADRÍCEPS + PANTURRILHA`).
4. **Instruções de Aquecimento:** Digite as orientações de aquecimento/mobilidade para o aluno.
5. **Adicionar Exercícios:**
   - Selecione o exercício da biblioteca.
   - Ajuste as Séries × Repetições (Ex: `3 × 12–15`).
   - Defina a previsão de Carga (Ex: `40–50 kg`).
   - Adicione uma Tag se desejar (Ex: `SUPERSET`, `BI-SET`, `DROP-SET`).
   - Você pode adicionar **quantos exercícios quiser** para aquele dia!
6. **Salvar Treino:** Clique em **"Salvar Treino do Dia"**. O treino estará imediatamente disponível no aplicativo do aluno.

---

### 3. Biblioteca de Exercícios (Aba "Exercícios")
- Permite cadastrar novos exercícios na biblioteca com categoria (QUADRÍCEPS, GLÚTEO, POSTERIOR, PEITO, COSTAS, OMBRO, BÍCEPS, TRÍCEPS, ABDÔMEN).
- Os exercícios cadastrados ficam disponíveis para seleção rápida durante a montagem de treinos.

---

### 4. Perfil do Personal (Aba "Meu Perfil")
- Altere seu nome de exibição, título e bio.
- Atualize a foto da sua marca/logo. Essa foto é exibida no topo do aplicativo de todos os seus alunos!
