# ✉️ Autenticação & E-mails — RGS Personal Trainer

Este documento detalha o sistema de autenticação, recuperação de senha e o envio de e-mails transacionais via Gmail SMTP com templates HTML.

---

## 📧 Servidor de E-mail (Gmail SMTP)

O sistema utiliza **Nodemailer** com a API do Gmail para enviar e-mails estilizados aos alunos.

### Credenciais Configuradas

```env
GMAIL_USER=regimarfr@gmail.com
GMAIL_APP_PASS=micnitugytxogfgf
```

> [!NOTE]
> A senha de app do Gmail (`micn itug ytxo gfgf`) é um código especial de 16 caracteres gerado na Conta Google que permite que a aplicação envie e-mails sem utilizar a senha primária da conta.

---

## 🎨 Templates HTML dos E-mails

Os e-mails são entregues com um layout escuro elegante, alinhado à identidade visual da marca RGS:

- **Cabeçalho:** Degradê vermelho escuro (`#c83e43` → `#832226`) com a marca **RGS PERSONAL TRAINER**.
- **Caixa de Código:** Borda tracejada vermelha com código de 6 dígitos em tamanho de fonte destacado (38px).
- **Rodapé:** Direitos reservados e aviso de mensagem automática.

---

## 🚀 Fluxos de Autenticação

### 1. Cadastro do Aluno (`POST /api/auth/register`)
1. O aluno preenche **Nome**, **Sobrenome**, **E-mail** e **Senha** na tela de registro do App.
2. O servidor gera um código aleatório de 6 dígitos (Ex: `849201`) com carimbo de data/hora (`code_created_at`).
3. O servidor envia um e-mail HTML de boas-vindas informando o código com **validade de 30 minutos**.
4. O aluno digita o código na tela de confirmação (`POST /api/auth/verify-email`).
5. Caso passem mais de 30 minutos, o sistema rejeita o código com a mensagem: *"O código de confirmação expirou (validade: 30 minutos). Entre em contato com o seu Personal Trainer para solicitar um novo e-mail de ativação."*
6. A conta é marcada como `is_verified = true` e o login é liberado.

---

### 2. Reenvio de Ativação pelo Personal Trainer (`POST /api/trainer/students/:id/resend-verification`)
1. No CMS Administrativo, o Personal Trainer pode clicar no botão **`📩 Reenviar Ativação`** no card de qualquer aluno.
2. O servidor renova o código de verificação de 6 dígitos, atualiza o timestamp `code_created_at = NOW()` e dispara um novo e-mail HTML com 30 minutos de validade para o aluno.

---

### 2. Recuperação de Senha (`POST /api/auth/forgot-password`)
1. O aluno solicita a recuperação informando seu e-mail.
2. O servidor valida se o e-mail existe no banco de dados.
3. Um código de 6 dígitos é gerado com expiração de 15 minutos (`reset_expires = NOW() + INTERVAL '15 minutes'`).
4. O servidor envia o e-mail HTML contendo o código.
5. O aluno insere o código e a nova senha no modal de redefinição (`POST /api/auth/reset-password`).
6. A senha é atualizada com hash bcrypt.

---

### 3. Autenticação em Duas Etapas / 2FA (`POST /api/auth/2fa/setup` & `/verify`)
1. O aluno pode ativar o 2FA nas configurações do perfil.
2. É gerado um QR Code que pode ser escaneado por aplicativos como **Google Authenticator** ou **Authy**.
3. Ao fazer login futuro, se o 2FA estiver ativado, o sistema solicita a chave de 6 dígitos do aplicativo autenticador antes de emitir o token JWT.

---

## 🔒 Tokens de Sessão (JWT)

- **Algoritmo:** HS256
- **Duração:** 7 dias (`expiresIn: '7d'`)
- **Conteúdo do Payload:**
  ```json
  {
    "id": 1,
    "email": "trainer@rgspersonal.com.br",
    "role": "trainer",
    "name": "Regis Personal"
  }
  ```
