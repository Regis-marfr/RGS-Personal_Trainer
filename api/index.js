const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { Pool } = require('pg');
require('dotenv').config();

const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));

const JWT_SECRET = process.env.JWT_SECRET || 'rgs_personal_trainer_jwt_super_secret_key_2026';

// -------------------------------------------------------------
// Database Connection Setup (PostgreSQL with In-Memory Dev Fallback)
// -------------------------------------------------------------
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
let pool = null;

if (dbUrl) {
    pool = new Pool({
        connectionString: dbUrl,
        ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    console.log('[RGS API] Connected to PostgreSQL Database.');
    pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS code_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`).catch(err => console.error('[DB Alter]', err));
} else {
    console.log('[RGS API] PostgreSQL URL not provided. Running in Local Dev Mode with In-Memory store.');
}

// In-Memory store for local development when PostgreSQL is not configured
const memoryStore = {
    users: [
        {
            id: 1,
            name: 'Regis Personal',
            email: 'trainer@rgspersonal.com.br',
            password_hash: '$2a$10$p6a/mB/F/jiL0Sff3gCBpuOA.TtUPh90jJC70GDPQIYrldiOx0AtW', // Hash for RGp005511@
            role: 'trainer',
            is_active: true,
            is_verified: true,
            photo_url: null,
            totp_secret: null,
            totp_enabled: false
        }
    ],
    trainer_profile: {
        user_id: 1,
        display_name: 'Regis Personal',
        title: 'REGIS · PERSONAL TRAINER',
        bio: 'Personal Trainer especialista em alta performance, hipertrofia e emagrecimento.',
        photo_url: null
    },
    anamnese: {},
    exercises: [
        { id: 1, name: 'Agachamento Smith', category: 'QUADRÍCEPS', default_sets_reps: '3 × 12–15', default_load: '40–50 kg' },
        { id: 2, name: 'Leg 45°', category: 'QUADRÍCEPS', default_sets_reps: '3 × 12–15', default_load: '120–140 kg' },
        { id: 3, name: 'Cadeira extensora', category: 'QUADRÍCEPS', default_sets_reps: '3 × 12–15', default_load: '35–45 kg' },
        { id: 4, name: 'Elevação pélvica', category: 'GLÚTEO', default_sets_reps: '3 × 12–15', default_load: '80 kg' },
        { id: 5, name: 'Abdutora — glúteo máximo', category: 'GLÚTEO', default_sets_reps: '3 × 12–15', default_load: '30–40 kg' },
        { id: 6, name: 'Puxada alta aberta pronada', category: 'COSTAS', default_sets_reps: '3 × 12–15', default_load: '20–35 kg' },
        { id: 7, name: 'Supino inclinado halteres', category: 'PEITO', default_sets_reps: '3 × 12–15', default_load: '10–14 kg por lado' },
        { id: 8, name: 'Elevação lateral halteres', category: 'OMBRO', default_sets_reps: '3 × 12–15', default_load: '5–8 kg por lado' }
    ],
    workouts: {},
    history: {}
};

// -------------------------------------------------------------
// Email Sending — Gmail SMTP with HTML Templates
// -------------------------------------------------------------
function buildEmailHtml(recipientName, title, bodyMessage, code, footerNote) {
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0f0f11;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f11;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#18181c;border-radius:16px;overflow:hidden;border:1px solid #2e2e34;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#c83e43,#832226);padding:28px 32px;text-align:center;">
          <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:2px;">RGS</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:4px;margin-top:4px;">PERSONAL TRAINER</div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <h2 style="margin:0 0 8px;color:#fff;font-size:20px;">${title}</h2>
          <p style="color:#a1a1aa;font-size:14px;line-height:1.7;margin:0 0 28px;">Olá <strong style="color:#e4e4e7;">${recipientName}</strong>, ${bodyMessage}</p>
          <!-- Code Box -->
          <div style="background:#0f0f11;border:2px dashed #c83e43;border-radius:12px;padding:24px;text-align:center;margin:0 0 28px;">
            <div style="font-size:11px;color:#71717a;letter-spacing:2px;margin-bottom:10px;">SEU CÓDIGO</div>
            <div style="font-size:38px;font-weight:900;color:#c83e43;letter-spacing:10px;">${code}</div>
            <div style="font-size:11px;color:#52525b;margin-top:10px;">Válido por 30 minutos</div>
          </div>
          <p style="color:#71717a;font-size:12px;line-height:1.6;margin:0;">${footerNote}</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#0f0f11;padding:20px 40px;border-top:1px solid #27272a;text-align:center;">
          <p style="color:#52525b;font-size:11px;margin:0;">© ${new Date().getFullYear()} RGS Personal Trainer · Todos os direitos reservados</p>
          <p style="color:#3f3f46;font-size:11px;margin:6px 0 0;">Este e-mail foi enviado automaticamente. Não responda.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmailCode(toEmail, subject, code, recipientName, bodyMessage, footerNote) {
    const gmailUser = process.env.GMAIL_USER || 'regimarfr@gmail.com';
    const gmailPass = process.env.GMAIL_APP_PASS || 'micn itug ytxo gfgf';

    const htmlContent = buildEmailHtml(
        recipientName || 'Aluno',
        subject,
        bodyMessage || 'utilize o código abaixo.',
        code,
        footerNote || 'Se você não solicitou este código, ignore este e-mail com segurança.'
    );

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: { user: gmailUser, pass: gmailPass }
        });
        await transporter.sendMail({
            from: `"RGS Personal Trainer" <${gmailUser}>`,
            to: toEmail,
            subject: subject,
            html: htmlContent,
            text: `${subject}\n\nOlá ${recipientName},\n\nSeu código: ${code}\n\nVálido por 30 minutos.\n\nEquipe RGS Personal Trainer.`
        });
        console.log(`[RGS Mail] ✅ E-mail enviado para ${toEmail}`);
        return true;
    } catch (err) {
        console.error(`[RGS Mail] ❌ Erro ao enviar e-mail para ${toEmail}:`, err.message);
        console.log(`[RGS Mail][FALLBACK] Código para ${toEmail}: ${code}`);
        return false;
    }
}

// Helper: Password Complexity Check
function validatePasswordRequirements(password) {
    if (!password || password.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
    if (!/[A-Z]/.test(password)) return 'A senha deve conter pelo menos uma letra maiúscula.';
    if (!/[a-z]/.test(password)) return 'A senha deve conter pelo menos uma letra minúscula.';
    if (!/[0-9]/.test(password)) return 'A senha deve conter pelo menos um número.';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'A senha deve conter pelo menos um caractere especial.';
    return null;
}

// Middleware: Authenticate JWT Token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
        req.user = user;
        next();
    });
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Register User (Student)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Por favor, preencha todos os campos obrigatórios.' });
        }

        const passErr = validatePasswordRequirements(password);
        if (passErr) return res.status(400).json({ error: passErr });

        const cleanEmail = email.trim().toLowerCase();
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const passwordHash = await bcrypt.hash(password, 10);

        if (pool) {
            const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
            if (existing.rows.length > 0) return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });

            await pool.query(
                `INSERT INTO users (name, email, password_hash, role, is_active, is_verified, verification_code, code_created_at)
                 VALUES ($1, $2, $3, 'student', true, false, $4, NOW())`,
                [name.trim(), cleanEmail, passwordHash, verificationCode]
            );
        } else {
            const existing = memoryStore.users.find(u => u.email === cleanEmail);
            if (existing) return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });

            const newUser = {
                id: memoryStore.users.length + 1,
                name: name.trim(),
                email: cleanEmail,
                password_hash: passwordHash,
                role: 'student',
                is_active: true,
                is_verified: false,
                verification_code: verificationCode,
                code_created_at: new Date(),
                totp_enabled: false
            };
            memoryStore.users.push(newUser);
        }

        await sendEmailCode(
            cleanEmail,
            '✅ RGS Personal Trainer — Confirme seu cadastro',
            verificationCode,
            name.trim(),
            'você foi cadastrado no App RGS Personal Trainer! Para ativar sua conta, utilize o código abaixo no aplicativo.',
            'Código válido por 30 minutos. Se você não criou uma conta no RGS Personal Trainer, ignore este e-mail.'
        );

        return res.json({ message: 'Cadastro iniciado! Enviamos um código de confirmação para seu e-mail.', email: cleanEmail });
    } catch (err) {
        console.error('[Register]', err);
        res.status(500).json({ error: 'Erro interno ao realizar cadastro.' });
    }
});

// 2. Verify Email Code
app.post('/api/auth/verify-email', async (req, res) => {
    try {
        const { email, code } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();

        let user = null;
        if (pool) {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
            user = result.rows[0];
            if (user.verification_code !== (code || '').trim()) return res.status(400).json({ error: 'Código de verificação incorreto.' });

            // Expiration check (30 minutes)
            if (user.code_created_at) {
                const elapsedMinutes = (Date.now() - new Date(user.code_created_at).getTime()) / (1000 * 60);
                if (elapsedMinutes > 30) {
                    return res.status(400).json({
                        error: 'O código de confirmação expirou (validade: 30 minutos). Entre em contato com o seu Personal Trainer para solicitar um novo e-mail de ativação.'
                    });
                }
            }

            await pool.query('UPDATE users SET is_verified = true, verification_code = NULL WHERE id = $1', [user.id]);
        } else {
            user = memoryStore.users.find(u => u.email === cleanEmail);
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
            if (user.verification_code !== (code || '').trim()) return res.status(400).json({ error: 'Código de verificação incorreto.' });

            // Expiration check (30 minutes)
            if (user.code_created_at) {
                const elapsedMinutes = (Date.now() - new Date(user.code_created_at).getTime()) / (1000 * 60);
                if (elapsedMinutes > 30) {
                    return res.status(400).json({
                        error: 'O código de confirmação expirou (validade: 30 minutos). Entre em contato com o seu Personal Trainer para solicitar um novo e-mail de ativação.'
                    });
                }
            }

            user.is_verified = true;
            user.verification_code = null;
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            message: 'E-mail confirmado com sucesso!',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('[VerifyEmail]', err);
        res.status(500).json({ error: 'Erro ao verificar código de e-mail.' });
    }
});

// 2b. Resend Verification Code Endpoint (Student Action)
app.post('/api/auth/resend-code', async (req, res) => {
    try {
        const { email } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();

        let user = null;
        if (pool) {
            const result = await pool.query('SELECT * FROM users WHERE email = $1 AND role = $2', [cleanEmail, 'student']);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });
            user = result.rows[0];
        } else {
            user = memoryStore.users.find(u => u.email === cleanEmail && u.role === 'student');
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        if (user.is_verified) {
            return res.status(400).json({ error: 'Sua conta já está ativada. Faça login normalmente.' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        if (pool) {
            await pool.query(
                'UPDATE users SET verification_code = $1, code_created_at = NOW() WHERE id = $2',
                [verificationCode, user.id]
            );
        } else {
            user.verification_code = verificationCode;
            user.code_created_at = new Date();
        }

        await sendEmailCode(
            user.email,
            '✅ RGS Personal Trainer — Novo código de ativação',
            verificationCode,
            user.name,
            'utilize o código abaixo no aplicativo para ativar sua conta.',
            'Código válido por 30 minutos. Se você não solicitou este e-mail, ignore com segurança.'
        );

        return res.json({ message: 'Novo código de confirmação enviado para seu e-mail!' });
    } catch (err) {
        console.error('[ResendCode]', err);
        res.status(500).json({ error: 'Erro ao reenviar código de confirmação.' });
    }
});

// 3. Login Endpoint (Supports Student & Personal Trainer)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, totp_code } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();

        let user = null;
        if (pool) {
            const resDb = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
            user = resDb.rows[0];
        } else {
            user = memoryStore.users.find(u => u.email === cleanEmail);
        }

        if (!user) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
        if (!user.is_active) return res.status(403).json({ error: 'Sua conta está bloqueada. Contate seu Personal Trainer.' });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(401).json({ error: 'E-mail ou senha inválidos.' });

        if (!user.is_verified) {
            return res.status(403).json({
                error: 'E-mail não verificado. Digite o código enviado para seu e-mail para ativar sua conta.',
                requires_verification: true,
                email: cleanEmail
            });
        }

        // 2FA TOTP check
        if (user.totp_enabled && user.totp_secret) {
            if (!totp_code) return res.status(200).json({ requires_2fa: true });
            const verified = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token: (totp_code || '').trim() });
            if (!verified) return res.status(400).json({ error: 'Código 2FA inválido.' });
        }

        // Anamnese status for students
        let hasAnamnese = true;
        if (user.role === 'student') {
            if (pool) {
                const anamRes = await pool.query('SELECT id FROM student_anamnese WHERE user_id = $1', [user.id]);
                hasAnamnese = anamRes.rows.length > 0;
            } else {
                hasAnamnese = !!memoryStore.anamnese[user.id];
            }
        }

        const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            message: 'Login realizado com sucesso!',
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role, photo_url: user.photo_url, totp_enabled: !!user.totp_enabled, has_anamnese: hasAnamnese }
        });
    } catch (err) {
        console.error('[Login]', err);
        res.status(500).json({ error: 'Erro no servidor ao realizar login.' });
    }
});

// 4. Password Recovery — Request Code
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        let recipientName = 'Aluno';
        if (pool) {
            const resDb = await pool.query('SELECT id, name FROM users WHERE email = $1', [cleanEmail]);
            if (resDb.rows.length === 0) return res.status(404).json({ error: 'Nenhum usuário cadastrado com este e-mail.' });
            recipientName = resDb.rows[0].name;
            await pool.query("UPDATE users SET reset_code = $1, reset_expires = NOW() + INTERVAL '15 minutes' WHERE id = $2", [code, resDb.rows[0].id]);
        } else {
            const user = memoryStore.users.find(u => u.email === cleanEmail);
            if (!user) return res.status(404).json({ error: 'Nenhum usuário cadastrado com este e-mail.' });
            recipientName = user.name;
            user.reset_code = code;
        }

        await sendEmailCode(
            cleanEmail,
            '🔑 RGS Personal Trainer — Recuperação de Senha',
            code,
            recipientName,
            'você solicitou a redefinição de sua senha no App RGS Personal Trainer. Use o código abaixo para criar uma nova senha.',
            'Se você não solicitou a recuperação de senha, ignore este e-mail. Sua senha permanece a mesma.'
        );

        res.json({ message: 'Código de recuperação enviado para o seu e-mail!' });
    } catch (err) {
        console.error('[ForgotPassword]', err);
        res.status(500).json({ error: 'Erro ao solicitar recuperação de senha.' });
    }
});

// 5. Password Recovery — Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, code, new_password } = req.body;
        const cleanEmail = (email || '').trim().toLowerCase();

        const passErr = validatePasswordRequirements(new_password);
        if (passErr) return res.status(400).json({ error: passErr });
        const hash = await bcrypt.hash(new_password, 10);

        if (pool) {
            const resDb = await pool.query('SELECT * FROM users WHERE email = $1 AND reset_code = $2', [cleanEmail, (code || '').trim()]);
            if (resDb.rows.length === 0) return res.status(400).json({ error: 'Código de recuperação inválido ou expirado.' });
            await pool.query('UPDATE users SET password_hash = $1, reset_code = NULL, reset_expires = NULL WHERE id = $2', [hash, resDb.rows[0].id]);
        } else {
            const user = memoryStore.users.find(u => u.email === cleanEmail);
            if (!user || user.reset_code !== (code || '').trim()) return res.status(400).json({ error: 'Código de recuperação inválido.' });
            user.password_hash = hash;
            user.reset_code = null;
        }

        res.json({ message: 'Senha redefinida com sucesso! Você já pode fazer login.' });
    } catch (err) {
        console.error('[ResetPassword]', err);
        res.status(500).json({ error: 'Erro ao redefinir senha.' });
    }
});

// 6. 2FA Setup — Generate Secret & QR Code
app.post('/api/auth/2fa/setup', authenticateToken, async (req, res) => {
    try {
        const secret = speakeasy.generateSecret({ name: `RGS Personal (${req.user.email})` });

        if (pool) {
            await pool.query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret.base32, req.user.id]);
        } else {
            const user = memoryStore.users.find(u => u.id === req.user.id);
            if (user) user.totp_secret = secret.base32;
        }

        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) return res.status(500).json({ error: 'Erro ao gerar QR Code.' });
            res.json({ secret: secret.base32, qr_code: data_url });
        });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao configurar 2FA.' });
    }
});

// 7. 2FA Enable Verification
app.post('/api/auth/2fa/enable', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        let secret = null;

        if (pool) {
            const userRes = await pool.query('SELECT totp_secret FROM users WHERE id = $1', [req.user.id]);
            secret = userRes.rows[0]?.totp_secret;
        } else {
            const user = memoryStore.users.find(u => u.id === req.user.id);
            secret = user?.totp_secret;
        }

        if (!secret) return res.status(400).json({ error: 'Primeiro inicie a configuração do 2FA.' });

        const verified = speakeasy.totp.verify({ secret, encoding: 'base32', token: (token || '').trim() });

        if (verified) {
            if (pool) {
                await pool.query('UPDATE users SET totp_enabled = true WHERE id = $1', [req.user.id]);
            } else {
                const user = memoryStore.users.find(u => u.id === req.user.id);
                if (user) user.totp_enabled = true;
            }
            return res.json({ message: 'Autenticação de 2 fatores ativada com sucesso!' });
        } else {
            return res.status(400).json({ error: 'Código incorreto. Tente novamente.' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Erro ao ativar 2FA.' });
    }
});

// 8. Student Anamnese Ficha
app.get('/api/student/ficha', authenticateToken, async (req, res) => {
    try {
        if (pool) {
            const result = await pool.query('SELECT * FROM student_anamnese WHERE user_id = $1', [req.user.id]);
            return res.json(result.rows[0] || null);
        } else {
            return res.json(memoryStore.anamnese[req.user.id] || null);
        }
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar ficha.' });
    }
});

app.post('/api/student/ficha', authenticateToken, async (req, res) => {
    try {
        const { age, weight, height, goal, medical_history, activity_level } = req.body;
        if (pool) {
            await pool.query(
                `INSERT INTO student_anamnese (user_id, age, weight, height, goal, medical_history, activity_level)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (user_id) DO UPDATE SET
                 age = $2, weight = $3, height = $4, goal = $5, medical_history = $6, activity_level = $7`,
                [req.user.id, age, weight, height, goal, medical_history, activity_level]
            );
        } else {
            memoryStore.anamnese[req.user.id] = { user_id: req.user.id, age, weight, height, goal, medical_history, activity_level };
        }
        res.json({ message: 'Ficha salva com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao salvar ficha do aluno.' });
    }
});

// 9a. Student Profile Name Update (POST)
app.post('/api/student/profile', authenticateToken, async (req, res) => {
    try {
        const { name, photo_url } = req.body;
        if (!name || !name.trim()) return res.status(400).json({ error: 'Nome não pode ser vazio.' });

        if (pool) {
            await pool.query('UPDATE users SET name = $1, photo_url = COALESCE($2, photo_url) WHERE id = $3', [
                name.trim(), photo_url || null, req.user.id
            ]);
        } else {
            const user = memoryStore.users.find(u => u.id === req.user.id);
            if (user) {
                user.name = name.trim();
                if (photo_url) user.photo_url = photo_url;
            }
        }
        res.json({ message: 'Perfil atualizado com sucesso!', name: name.trim() });
    } catch (err) {
        console.error('[UpdateProfile]', err);
        res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }
});

// 9b. Student Profile Full Update (PUT)
app.put('/api/student/profile', authenticateToken, async (req, res) => {
    try {
        const { name, photo_url, current_password, new_password } = req.body;

        if (pool) {
            const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
            const user = userRes.rows[0];

            let passHash = user.password_hash;
            if (new_password) {
                if (!current_password) return res.status(400).json({ error: 'Informe a senha atual para alterar.' });
                const match = await bcrypt.compare(current_password, user.password_hash);
                if (!match) return res.status(400).json({ error: 'Senha atual incorreta.' });
                const passErr = validatePasswordRequirements(new_password);
                if (passErr) return res.status(400).json({ error: passErr });
                passHash = await bcrypt.hash(new_password, 10);
            }

            await pool.query('UPDATE users SET name = $1, photo_url = $2, password_hash = $3 WHERE id = $4', [
                name || user.name,
                photo_url !== undefined ? photo_url : user.photo_url,
                passHash,
                req.user.id
            ]);
        } else {
            const user = memoryStore.users.find(u => u.id === req.user.id);
            if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

            if (new_password) {
                if (!current_password) return res.status(400).json({ error: 'Informe a senha atual para alterar.' });
                const match = await bcrypt.compare(current_password, user.password_hash);
                if (!match) return res.status(400).json({ error: 'Senha atual incorreta.' });
                const passErr = validatePasswordRequirements(new_password);
                if (passErr) return res.status(400).json({ error: passErr });
                user.password_hash = await bcrypt.hash(new_password, 10);
            }

            if (name) user.name = name;
            if (photo_url !== undefined) user.photo_url = photo_url;
        }

        res.json({ message: 'Perfil atualizado com sucesso!' });
    } catch (err) {
        console.error('[PutProfile]', err);
        res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }
});

// 10. Student Active Workout Fetch
app.get('/api/student/workout', authenticateToken, async (req, res) => {
    try {
        let trainerTitle = 'REGIS · PERSONAL TRAINER';
        let trainerPhoto = null;
        let goal = 'HIPERTROFIA + DEFINIÇÃO';

        if (pool) {
            const tp = await pool.query('SELECT photo_url, title FROM trainer_profile LIMIT 1');
            if (tp.rows.length > 0) { trainerPhoto = tp.rows[0].photo_url; trainerTitle = tp.rows[0].title || trainerTitle; }

            const anam = await pool.query('SELECT goal FROM student_anamnese WHERE user_id = $1', [req.user.id]);
            if (anam.rows.length > 0 && anam.rows[0].goal) goal = anam.rows[0].goal;

            const wkRes = await pool.query(
                `SELECT w.day_code, w.title, w.warmup_info, we.exercise_name, we.sets_reps, we.load_prediction, we.type_tag, we.order_index
                 FROM workouts w LEFT JOIN workout_exercises we ON w.id = we.workout_id
                 WHERE w.student_id = $1 ORDER BY we.order_index ASC`,
                [req.user.id]
            );

            const workoutsMap = {};
            wkRes.rows.forEach(r => {
                if (!workoutsMap[r.day_code]) workoutsMap[r.day_code] = { title: r.title, warmup: r.warmup_info, exercises: [] };
                if (r.exercise_name) workoutsMap[r.day_code].exercises.push({ name: r.exercise_name, sets_reps: r.sets_reps, load: r.load_prediction, tag: r.type_tag || '' });
            });

            return res.json({ trainer_photo: trainerPhoto, trainer_title: trainerTitle, student_name: req.user.name, goal, workouts: workoutsMap });
        } else {
            trainerPhoto = memoryStore.trainer_profile.photo_url;
            trainerTitle = memoryStore.trainer_profile.title;
            const userAnam = memoryStore.anamnese[req.user.id];
            if (userAnam && userAnam.goal) goal = userAnam.goal;

            return res.json({
                trainer_photo: trainerPhoto,
                trainer_title: trainerTitle,
                student_name: req.user.name,
                goal,
                workouts: memoryStore.workouts[req.user.id] || {}
            });
        }
    } catch (err) {
        console.error('[StudentWorkout]', err);
        res.status(500).json({ error: 'Erro ao buscar treino do aluno.' });
    }
});

// Personal Trainer Middleware
function requireTrainer(req, res, next) {
    if (req.user && req.user.role === 'trainer') return next();
    return res.status(403).json({ error: 'Acesso permitido apenas para Personal Trainers.' });
}

// Get Trainer Profile
app.get('/api/trainer/profile', authenticateToken, requireTrainer, async (req, res) => {
    if (pool) {
        const result = await pool.query('SELECT * FROM trainer_profile WHERE user_id = $1', [req.user.id]);
        return res.json(result.rows[0] || memoryStore.trainer_profile);
    }
    return res.json(memoryStore.trainer_profile);
});

// Update Trainer Profile
app.put('/api/trainer/profile', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const { display_name, title, bio, photo_url } = req.body;
        if (pool) {
            await pool.query(
                `INSERT INTO trainer_profile (user_id, display_name, title, bio, photo_url)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (user_id) DO UPDATE SET display_name = $2, title = $3, bio = $4, photo_url = $5`,
                [req.user.id, display_name, title, bio, photo_url]
            );
        } else {
            memoryStore.trainer_profile = { user_id: req.user.id, display_name, title, bio, photo_url };
        }
        res.json({ message: 'Perfil do Personal Trainer atualizado com sucesso!' });
    } catch (err) {
        console.error('[TrainerProfile]', err);
        res.status(500).json({ error: 'Erro ao salvar perfil do personal.' });
    }
});

// Get List of Students
app.get('/api/trainer/students', authenticateToken, requireTrainer, async (req, res) => {
    try {
        if (pool) {
            const result = await pool.query(
                `SELECT u.id, u.name, u.email, u.is_active, u.created_at,
                        sa.age, sa.weight, sa.height, sa.goal, sa.medical_history, sa.activity_level
                 FROM users u LEFT JOIN student_anamnese sa ON u.id = sa.user_id
                 WHERE u.role = 'student' ORDER BY u.created_at DESC`
            );
            return res.json(result.rows);
        } else {
            const students = memoryStore.users
                .filter(u => u.role === 'student')
                .map(u => ({
                    ...u,
                    ...(memoryStore.anamnese[u.id] || {})
                }));
            return res.json(students);
        }
    } catch (err) {
        console.error('[GetStudents]', err);
        res.status(500).json({ error: 'Erro ao listar alunos.' });
    }
});

app.put('/api/trainer/students/:id/status', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const { is_active } = req.body;

        if (pool) {
            await pool.query('UPDATE users SET is_active = $1 WHERE id = $2 AND role = $3', [is_active, studentId, 'student']);
        } else {
            const student = memoryStore.users.find(u => u.id === studentId);
            if (student) student.is_active = is_active;
        }
        res.json({ message: `Aluno ${is_active ? 'ativado' : 'bloqueado'} com sucesso!` });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao alterar status do aluno.' });
    }
});

app.put('/api/trainer/students/:id/password', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const { new_password } = req.body;

        const passErr = validatePasswordRequirements(new_password);
        if (passErr) return res.status(400).json({ error: passErr });

        const hash = await bcrypt.hash(new_password, 10);

        if (pool) {
            await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 AND role = $3', [hash, studentId, 'student']);
        } else {
            const student = memoryStore.users.find(u => u.id === studentId);
            if (student) student.password_hash = hash;
        }
        res.json({ message: 'Senha do aluno atualizada com sucesso!' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao alterar senha do aluno.' });
    }
});

// Delete Student Account
app.delete('/api/trainer/students/:id', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        if (pool) {
            await pool.query('DELETE FROM student_anamnese WHERE student_id = $1', [studentId]);
            await pool.query('DELETE FROM workout_history WHERE student_id = $1', [studentId]);
            const wk = await pool.query('SELECT id FROM workouts WHERE student_id = $1', [studentId]);
            for (const r of wk.rows) {
                await pool.query('DELETE FROM workout_exercises WHERE workout_id = $1', [r.id]);
            }
            await pool.query('DELETE FROM workouts WHERE student_id = $1', [studentId]);
            await pool.query('DELETE FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);
        } else {
            const idx = memoryStore.users.findIndex(u => u.id === studentId && u.role === 'student');
            if (idx !== -1) memoryStore.users.splice(idx, 1);
            delete memoryStore.workouts[studentId];
        }
        res.json({ message: 'Aluno e todos os seus dados foram excluídos com sucesso!' });
    } catch (err) {
        console.error('[DeleteStudent]', err);
        res.status(500).json({ error: 'Erro ao excluir aluno.' });
    }
});

// Resend Student Verification Email (Personal Trainer Action)
app.post('/api/trainer/students/:id/resend-verification', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        let studentEmail = '';
        let studentName = '';

        if (pool) {
            const userRes = await pool.query('SELECT name, email FROM users WHERE id = $1 AND role = $2', [studentId, 'student']);
            if (userRes.rows.length === 0) return res.status(404).json({ error: 'Aluno não encontrado.' });
            studentName = userRes.rows[0].name;
            studentEmail = userRes.rows[0].email;

            await pool.query(
                'UPDATE users SET verification_code = $1, code_created_at = NOW(), is_verified = false WHERE id = $2',
                [verificationCode, studentId]
            );
        } else {
            const student = memoryStore.users.find(u => u.id === studentId && u.role === 'student');
            if (!student) return res.status(404).json({ error: 'Aluno não encontrado.' });
            studentName = student.name;
            studentEmail = student.email;
            student.verification_code = verificationCode;
            student.code_created_at = new Date();
            student.is_verified = false;
        }

        await sendEmailCode(
            studentEmail,
            '✅ RGS Personal Trainer — Novo código de ativação',
            verificationCode,
            studentName,
            'seu Personal Trainer enviou um novo código de ativação para sua conta. Utilize o código abaixo no aplicativo para ativar seu acesso.',
            'Código válido por 30 minutos. Se você não solicitou este e-mail, entre em contato com seu Personal Trainer.'
        );

        res.json({ message: `Novo e-mail de ativação enviado com sucesso para ${studentName} (${studentEmail})!` });
    } catch (err) {
        console.error('[ResendVerification]', err);
        res.status(500).json({ error: 'Erro ao reenviar e-mail de ativação.' });
    }
});

// Exercise Library Management
app.get('/api/trainer/exercises', authenticateToken, async (req, res) => {
    if (pool) {
        const result = await pool.query('SELECT * FROM exercises ORDER BY category, name');
        return res.json(result.rows);
    }
    return res.json(memoryStore.exercises);
});

app.post('/api/trainer/exercises', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const { name, category, default_sets_reps, default_load } = req.body;
        if (pool) {
            const result = await pool.query(
                'INSERT INTO exercises (name, category, default_sets_reps, default_load, trainer_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [name, category, default_sets_reps, default_load, req.user.id]
            );
            return res.json(result.rows[0]);
        } else {
            const ex = { id: memoryStore.exercises.length + 1, name, category, default_sets_reps, default_load };
            memoryStore.exercises.push(ex);
            return res.json(ex);
        }
    } catch (err) {
        res.status(500).json({ error: 'Erro ao cadastrar exercício.' });
    }
});

// Delete Exercise from Library
app.delete('/api/trainer/exercises/:id', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const exerciseId = parseInt(req.params.id);
        if (pool) {
            await pool.query('DELETE FROM exercises WHERE id = $1', [exerciseId]);
        } else {
            const idx = memoryStore.exercises.findIndex(e => e.id === exerciseId);
            if (idx !== -1) memoryStore.exercises.splice(idx, 1);
        }
        res.json({ message: 'Exercício removido do acervo com sucesso!' });
    } catch (err) {
        console.error('[DeleteExercise]', err);
        res.status(500).json({ error: 'Erro ao excluir exercício.' });
    }
});



// Create/Update Workout Routine for a Student
app.post('/api/trainer/workouts', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const { student_id, day_code, title, warmup, exercises } = req.body;

        if (pool) {
            const wk = await pool.query(
                `INSERT INTO workouts (student_id, day_code, title, warmup_info, trainer_id)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (student_id, day_code) DO UPDATE SET title = $3, warmup_info = $4
                 RETURNING id`,
                [student_id, day_code, title, warmup, req.user.id]
            );
            const workoutId = wk.rows[0].id;
            await pool.query('DELETE FROM workout_exercises WHERE workout_id = $1', [workoutId]);

            for (let i = 0; i < (exercises || []).length; i++) {
                const ex = exercises[i];
                await pool.query(
                    'INSERT INTO workout_exercises (workout_id, exercise_name, sets_reps, load_prediction, type_tag, order_index) VALUES ($1, $2, $3, $4, $5, $6)',
                    [workoutId, ex.name, ex.sets_reps, ex.load, ex.tag || '', i]
                );
            }
        } else {
            memoryStore.workouts[student_id] = memoryStore.workouts[student_id] || {};
            memoryStore.workouts[student_id][day_code] = { title, warmup, exercises: exercises || [] };
        }

        res.json({ message: 'Treino salvo com sucesso!' });
    } catch (err) {
        console.error('[SaveWorkout]', err);
        res.status(500).json({ error: 'Erro ao salvar treino.' });
    }
});

// Delete Workout Routine for a specific day
app.delete('/api/trainer/workouts/:studentId/:dayCode', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        const dayCode = req.params.dayCode.toUpperCase();
        if (pool) {
            const wk = await pool.query('SELECT id FROM workouts WHERE student_id = $1 AND day_code = $2', [studentId, dayCode]);
            if (wk.rows.length > 0) {
                const workoutId = wk.rows[0].id;
                await pool.query('DELETE FROM workout_exercises WHERE workout_id = $1', [workoutId]);
                await pool.query('DELETE FROM workouts WHERE id = $1', [workoutId]);
            }
        } else {
            if (memoryStore.workouts[studentId] && memoryStore.workouts[studentId][dayCode]) {
                delete memoryStore.workouts[studentId][dayCode];
            }
        }
        res.json({ message: `Treino de ${dayCode} excluído com sucesso!` });
    } catch (err) {
        console.error('[DeleteWorkout]', err);
        res.status(500).json({ error: 'Erro ao excluir treino do dia.' });
    }
});

// Get Workout Routines for a Specific Student (CMS Trainer)
app.get('/api/trainer/workouts/:studentId', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const studentId = parseInt(req.params.studentId);
        if (pool) {
            const wkResult = await pool.query('SELECT * FROM workouts WHERE student_id = $1', [studentId]);
            const workoutsMap = {};

            for (const wk of wkResult.rows) {
                const exResult = await pool.query(
                    'SELECT exercise_name as name, sets_reps, load_prediction as load, type_tag as tag FROM workout_exercises WHERE workout_id = $1 ORDER BY order_index ASC',
                    [wk.id]
                );
                workoutsMap[wk.day_code] = {
                    id: wk.id,
                    title: wk.title,
                    warmup: wk.warmup_info,
                    exercises: exResult.rows
                };
            }
            return res.json(workoutsMap);
        } else {
            return res.json(memoryStore.workouts[studentId] || {});
        }
    } catch (err) {
        console.error('[GetStudentWorkouts]', err);
        res.status(500).json({ error: 'Erro ao buscar treinos do aluno.' });
    }
});

// Workout History Endpoints
app.post('/api/student/history', authenticateToken, async (req, res) => {
    try {
        const { day_code, workout_title, exercises_data, notes } = req.body;
        const userId = req.user.id;

        if (pool) {
            await pool.query(
                `INSERT INTO workout_history (user_id, day_code, workout_title, exercises_data, notes, trained_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
                [userId, day_code, workout_title, JSON.stringify(exercises_data), notes || '']
            );
        } else {
            memoryStore.history = memoryStore.history || {};
            memoryStore.history[userId] = memoryStore.history[userId] || [];
            memoryStore.history[userId].push({
                id: Date.now(),
                user_id: userId,
                day_code,
                workout_title,
                exercises_data,
                notes: notes || '',
                trained_at: new Date().toISOString().split('T')[0],
                created_at: new Date().toISOString()
            });
        }

        res.json({ message: 'Treino registrado no histórico com sucesso!' });
    } catch (err) {
        console.error('[SaveHistory]', err);
        res.status(500).json({ error: 'Erro ao salvar histórico.' });
    }
});

app.get('/api/student/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        if (pool) {
            const result = await pool.query(
                `SELECT id, day_code, workout_title, trained_at, exercises_data, notes, created_at
                 FROM workout_history WHERE user_id = $1
                 ORDER BY trained_at DESC, created_at DESC
                 LIMIT 50`,
                [userId]
            );
            return res.json(result.rows);
        } else {
            return res.json((memoryStore.history && memoryStore.history[userId]) || []);
        }
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar histórico.' });
    }
});

app.get('/api/trainer/students/:id/history', authenticateToken, requireTrainer, async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);

        if (pool) {
            const result = await pool.query(
                `SELECT id, day_code, workout_title, trained_at, exercises_data, notes
                 FROM workout_history WHERE user_id = $1
                 ORDER BY trained_at DESC, created_at DESC
                 LIMIT 50`,
                [studentId]
            );
            return res.json(result.rows);
        } else {
            return res.json((memoryStore.history && memoryStore.history[studentId]) || []);
        }
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar histórico do aluno.' });
    }
});

// Root & Healthcheck
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date(), dev_mode: !pool });
});

// Export Express App for Vercel Serverless Execution
module.exports = app;

// Listen if started directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`[RGS Server] Servidor executando em http://localhost:${PORT}`);
    });
}
