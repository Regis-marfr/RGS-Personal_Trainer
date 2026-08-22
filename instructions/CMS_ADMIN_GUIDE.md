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
- **Bloqueio/Desbloqueio:** Botão `🚫 Bloquear` / `✅ Ativar` para liberar ou suspender a conta do aluno.
- **Reenvio de Ativação:** Botão `📩 Reenviar Ativação` dispara um novo e-mail com código de confirmação válido por 30 minutos caso o aluno tenha perdido o prazo de ativação.
- **Alteração de Senha:** Botão `🔑 Trocar Senha` para redefinir a senha de qualquer aluno diretamente pelo CMS.
- **Exclusão Permanentemente:** Botão `🗑️ Excluir Aluno` (com confirmação de segurança) remove o aluno e todo o seu histórico, treinos e ficha de anamnese do sistema.

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
6. **Salvar / Excluir Treino:** 
   - Clique em **"💾 Salvar e Publicar Treino do Dia"** para disponibilizar no aplicativo.
   - Clique em **"🗑️ Excluir Treino do Dia"** para remover completamente a rotina do dia selecionado.

---

### 3. Biblioteca de Exercícios (Aba "Exercícios")
- **Cadastrar Exercício:** Preencha o nome, categoria, séries/repetições recomendadas e carga sugerida.
  - *Nota:* O campo *Séries × Repetições* possui um placeholder indicativo (`Ex: 3 × 12–15`) limpo, permitindo digitação direta sem necessidade de apagar textos pré-existentes.
- **Excluir Exercício:** Botão `🗑️ Excluir` em cada item do acervo para remover o exercício da biblioteca.

---

### 4. Perfil do Personal (Aba "Meu Perfil")
- Altere seu nome de exibição, título e bio.
- Atualize a foto da sua marca/logo. Essa foto é exibida no topo do aplicativo de todos os seus alunos!

