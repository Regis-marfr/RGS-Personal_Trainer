-- ============================================================
-- RGS Personal Trainer - Database Schema (PostgreSQL)
-- Compatible with: Supabase, Neon, Vercel Postgres, Railway
-- Run this on your PostgreSQL database before deploying.
-- ============================================================

-- Users Table (Students & Trainer)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'trainer')),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(10),
    reset_code VARCHAR(10),
    reset_expires TIMESTAMP WITH TIME ZONE,
    photo_url TEXT,
    totp_secret VARCHAR(100),
    totp_enabled BOOLEAN DEFAULT FALSE,
    code_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student Anamnese (Assessment Form)
CREATE TABLE IF NOT EXISTS student_anamnese (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    age INTEGER,
    weight NUMERIC(5,2),
    height NUMERIC(5,2),
    goal TEXT,
    medical_history TEXT,
    activity_level VARCHAR(50),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Personal Trainer Profile
CREATE TABLE IF NOT EXISTS trainer_profile (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    display_name VARCHAR(100) DEFAULT 'Regis Personal',
    title VARCHAR(100) DEFAULT 'REGIS · PERSONAL TRAINER',
    bio TEXT,
    photo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Exercise Library
CREATE TABLE IF NOT EXISTS exercises (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    default_sets_reps VARCHAR(50) DEFAULT '3 × 12–15',
    default_load VARCHAR(50),
    trainer_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student Workout Routines (Set by Trainer)
CREATE TABLE IF NOT EXISTS workouts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_code VARCHAR(5) NOT NULL CHECK (day_code IN ('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM')),
    title VARCHAR(150) NOT NULL,
    warmup_info TEXT DEFAULT '5 min de aquecimento + mobilidade específica + 1 série leve do primeiro exercício.',
    trainer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_day UNIQUE(student_id, day_code)
);

-- Exercises within a Workout Day
CREATE TABLE IF NOT EXISTS workout_exercises (
    id SERIAL PRIMARY KEY,
    workout_id INTEGER REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_name VARCHAR(150) NOT NULL,
    sets_reps VARCHAR(50) NOT NULL DEFAULT '3 × 12–15',
    load_prediction VARCHAR(50),
    type_tag VARCHAR(50),
    order_index INTEGER DEFAULT 0
);

-- Workout History (Student Progress Records)
CREATE TABLE IF NOT EXISTS workout_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_code VARCHAR(5) NOT NULL,
    workout_title VARCHAR(150),
    trained_at DATE NOT NULL DEFAULT CURRENT_DATE,
    exercises_data JSONB NOT NULL DEFAULT '[]',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED: Personal Trainer Administrator Account
-- Name: Regis Personal
-- Email: trainer@rgspersonal.com.br
-- Password: RGp005511@  (bcrypt hash below)
-- ============================================================
INSERT INTO users (name, email, password_hash, role, is_active, is_verified)
VALUES (
    'Regis Personal',
    'trainer@rgspersonal.com.br',
    '$2a$10$p6a/mB/F/jiL0Sff3gCBpuOA.TtUPh90jJC70GDPQIYrldiOx0AtW',
    'trainer',
    TRUE,
    TRUE
)
ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
        role = EXCLUDED.role,
        is_active = EXCLUDED.is_active,
        is_verified = EXCLUDED.is_verified;

-- Trainer Profile Entry
INSERT INTO trainer_profile (user_id, display_name, title, bio)
SELECT id, 'Regis Personal', 'REGIS · PERSONAL TRAINER',
       'Personal Trainer certificado, especialista em hipertrofia, definição e emagrecimento.'
FROM users WHERE email = 'trainer@rgspersonal.com.br'
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- SEED: Default Exercise Library
-- ============================================================
INSERT INTO exercises (name, category, default_sets_reps, default_load) VALUES
('Agachamento Smith',          'QUADRÍCEPS', '3 × 12–15', '40–50 kg'),
('Leg 45°',                    'QUADRÍCEPS', '3 × 12–15', '120–140 kg'),
('Cadeira extensora',          'QUADRÍCEPS', '3 × 12–15', '35–45 kg'),
('Hack squat',                 'QUADRÍCEPS', '3 × 12–15', '40–60 kg'),
('Agachamento taça',           'QUADRÍCEPS', '3 × 12–15', '20–22 kg'),
('Passada com barra',          'QUADRÍCEPS', '3 × 10–12', '20–25 kg por lado'),
('Búlgaro',                    'QUADRÍCEPS', '3 × 10–12', '15–20 kg por lado'),
('Elevação pélvica',           'GLÚTEO',     '3 × 12–15', '80–100 kg'),
('Abdutora — glúteo máximo',   'GLÚTEO',     '3 × 15–20', '30–40 kg'),
('Coice na polia',             'GLÚTEO',     '3 × 15–20', '20–30 kg'),
('Cadeira flexora',            'POSTERIOR',  '3 × 12–15', '40–50 kg'),
('Flexora em pé',              'POSTERIOR',  '3 × 12–15', '15–20 kg'),
('Stiff',                      'POSTERIOR',  '3 × 10–12', '40–50 kg'),
('Cadeira adutora',            'INTERIOR',   '3 × 15–20', '40–60 kg'),
('Puxada alta aberta pronada', 'COSTAS',     '3 × 12–15', '20–35 kg'),
('Remada baixa',               'COSTAS',     '3 × 12–15', '25–40 kg'),
('Supino inclinado halteres',  'PEITO',      '3 × 12–15', '10–14 kg por lado'),
('Crucifixo inclinado',        'PEITO',      '3 × 12–15', '8–12 kg por lado'),
('Elevação lateral halteres',  'OMBRO',      '3 × 12–15', '5–8 kg por lado'),
('Desenvolvimento halteres',   'OMBRO',      '3 × 12–15', '8–12 kg por lado'),
('Rosca direta barra',         'BÍCEPS',     '3 × 10–12', '15–25 kg'),
('Tríceps corda polia',        'TRÍCEPS',    '3 × 12–15', '20–30 kg'),
('Panturrilha Smith',          'PANTURRILHA','4 × 15–20', '40–60 kg'),
('Abdominal crunch',           'ABDÔMEN',    '3 × 20',    'peso corporal')
ON CONFLICT DO NOTHING;
