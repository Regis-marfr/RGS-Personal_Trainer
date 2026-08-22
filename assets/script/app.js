/* =============================================================
   RGS Personal Trainer - Application Logic & Module Architecture
   ============================================================= */

// Application Global State
const State = {
    token: localStorage.getItem('rgs_token') || null,
    user: JSON.parse(localStorage.getItem('rgs_user') || 'null'),
    curDay: 'SEG',
    workoutPlan: {},
    trainerInfo: { photo: null, title: 'REGIS · PERSONAL TRAINER' },
    studentData: JSON.parse(localStorage.getItem('rgs_workout_loads') || '{}'),
    timerInterval: null
};

// API Base URL (Supports local IIS testing, LAN IPs, and Vercel serverless /api)
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/);
const API_URL = isDev && window.location.port !== '3000'
    ? `http://${window.location.hostname}:3000/api`
    : '/api';

// Utility API Fetch wrapper
async function apiFetch(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (State.token) {
        headers['Authorization'] = `Bearer ${State.token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        const contentType = response.headers.get('content-type') || '';

        let data;
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Resposta do servidor não esperada (${response.status}).`);
        }

        if (!response.ok) {
            throw new Error(data.error || 'Ocorreu um erro na requisição.');
        }
        return data;
    } catch (err) {
        console.error(`[API Error] ${endpoint}:`, err.message);
        throw err;
    }
}

// -------------------------------------------------------------
// 1. Password Strength Calculator & Indicator
// -------------------------------------------------------------
function checkPasswordStrength(password, fillElemId, textElemId, rulesContainerId) {
    const fillElem = document.getElementById(fillElemId);
    const textElem = document.getElementById(textElemId);
    if (!fillElem || !textElem) return;

    if (!password) {
        fillElem.className = 'strength-bar-fill';
        textElem.textContent = 'Força da senha';
        return;
    }

    let score = 0;
    const hasMinLen = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (hasMinLen) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    // Update rule checklist if present
    if (rulesContainerId) {
        const container = document.getElementById(rulesContainerId);
        if (container) {
            container.querySelector('.rule-len')?.classList.toggle('valid', hasMinLen);
            container.querySelector('.rule-upper')?.classList.toggle('valid', hasUpper);
            container.querySelector('.rule-lower')?.classList.toggle('valid', hasLower);
            container.querySelector('.rule-num')?.classList.toggle('valid', hasNumber);
            container.querySelector('.rule-spec')?.classList.toggle('valid', hasSpecial);
        }
    }

    let strengthClass = '';
    let label = '';

    switch (score) {
        case 1:
            strengthClass = 'strength-very-weak';
            label = 'Muito Fraca 🔴';
            break;
        case 2:
            strengthClass = 'strength-weak';
            label = 'Fraca 🟠';
            break;
        case 3:
            strengthClass = 'strength-medium';
            label = 'Média 🟡';
            break;
        case 4:
            strengthClass = 'strength-strong';
            label = 'Forte 🟢';
            break;
        case 5:
            strengthClass = 'strength-very-strong';
            label = 'Excelente 🟢🔥';
            break;
        default:
            strengthClass = '';
            label = 'Força da senha';
    }

    fillElem.className = `strength-bar-fill ${strengthClass}`;
    textElem.textContent = label;
}

// -------------------------------------------------------------
// 2. Authentication & Modal Controls
// -------------------------------------------------------------
const Auth = {
    async login(email, password, totp_code = '') {
        try {
            const data = await apiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, totp_code })
            });

            if (data.requires_2fa) {
                document.getElementById('2faFieldGroup').style.display = 'block';
                showToast('Insira o código do seu aplicativo de autenticação (2FA).', 'info');
                return;
            }

            State.token = data.token;
            State.user = data.user;
            localStorage.setItem('rgs_token', data.token);
            localStorage.setItem('rgs_user', JSON.stringify(data.user));

            closeModal('authModal');
            showToast('Login efetuado com sucesso!', 'success');
            initApp();

            // Prompt anamnese if new student has not filled it
            if (data.user.role === 'student' && !data.user.has_anamnese) {
                openModal('fichaModal');
            }
        } catch (err) {
            showToast(err.message || 'Não foi possível conectar ao servidor. Verifique sua conexão.', 'error');
        }
    },

    async register(firstName, lastName, email, password) {
        const cleanFirst = (firstName || '').trim();
        const cleanLast = (lastName || '').trim();
        if (!cleanFirst) {
            showToast('Por favor, informe seu nome.', 'error');
            return;
        }
        if (!cleanLast) {
            showToast('Por favor, informe seu sobrenome.', 'error');
            return;
        }

        const fullName = `${cleanFirst} ${cleanLast}`;

        try {
            const data = await apiFetch('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ name: fullName, email, password })
            });

            document.getElementById('verifyEmailInput').value = email;
            closeModal('registerModal');
            openModal('verifyModal');
            showToast(data.message, 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    async verifyEmail(email, code) {
        try {
            const data = await apiFetch('/auth/verify-email', {
                method: 'POST',
                body: JSON.stringify({ email, code })
            });

            State.token = data.token;
            State.user = data.user;
            localStorage.setItem('rgs_token', data.token);
            localStorage.setItem('rgs_user', JSON.stringify(data.user));

            closeModal('verifyModal');
            showToast('E-mail confirmado! Preencha sua ficha para começar.', 'success');
            initApp();
            openModal('fichaModal');
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    async forgotPassword(email) {
        try {
            const data = await apiFetch('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            document.getElementById('resetEmailInput').value = email;
            closeModal('forgotModal');
            openModal('resetModal');
            showToast(data.message, 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    async resetPassword(email, code, new_password) {
        try {
            const data = await apiFetch('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ email, code, new_password })
            });
            closeModal('resetModal');
            openModal('authModal');
            showToast(data.message, 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    logout() {
        State.token = null;
        State.user = null;
        localStorage.removeItem('rgs_token');
        localStorage.removeItem('rgs_user');
        showToast('Sessão encerrada.', 'info');
        openModal('authModal');
    }
};

// -------------------------------------------------------------
// 3. Student Anamnese Ficha Manager
// -------------------------------------------------------------
const Anamnese = {
    async save(formData) {
        try {
            if (State.token) {
                await apiFetch('/student/ficha', {
                    method: 'POST',
                    body: JSON.stringify(formData)
                });
            } else {
                localStorage.setItem('rgs_demo_ficha', JSON.stringify(formData));
            }
            closeModal('fichaModal');
            showToast('Ficha salva com sucesso! Bom treino!', 'success');
            loadStudentWorkout();
        } catch (err) {
            console.warn('Erro ao salvar no servidor, salvando localmente:', err.message);
            localStorage.setItem('rgs_demo_ficha', JSON.stringify(formData));
            closeModal('fichaModal');
            showToast('Ficha salva com sucesso! Bom treino!', 'success');
            loadStudentWorkout();
        }
    },

    async load() {
        if (!State.token) {
            const localData = JSON.parse(localStorage.getItem('rgs_demo_ficha') || 'null');
            if (localData) {
                document.getElementById('fichaAge').value = localData.age || '';
                document.getElementById('fichaWeight').value = localData.weight || '';
                document.getElementById('fichaHeight').value = localData.height || '';
                document.getElementById('fichaGoal').value = localData.goal || 'HIPERTROFIA + DEFINIÇÃO';
                document.getElementById('fichaMedical').value = localData.medical_history || '';
                document.getElementById('fichaActivity').value = localData.activity_level || 'Intermediário';
            }
            return;
        }
        try {
            const data = await apiFetch('/student/ficha');
            if (data) {
                document.getElementById('fichaAge').value = data.age || '';
                document.getElementById('fichaWeight').value = data.weight || '';
                document.getElementById('fichaHeight').value = data.height || '';
                document.getElementById('fichaGoal').value = data.goal || 'HIPERTROFIA + DEFINIÇÃO';
                document.getElementById('fichaMedical').value = data.medical_history || '';
                document.getElementById('fichaActivity').value = data.activity_level || 'Intermediário';
            }
        } catch (err) {
            console.error('Erro ao carregar ficha:', err);
        }
    }
};

// -------------------------------------------------------------
// 4. Student Workout View & Day Switcher
// -------------------------------------------------------------
// (Sem treino padrão: o Personal configura os treinos pelo CMS para cada aluno)


async function loadStudentWorkout() {
    if (!State.token) {
        // Apply trainer photo if set via admin.html
        const localTrainer = JSON.parse(localStorage.getItem('rgs_trainer_profile') || 'null');
        if (localTrainer && localTrainer.photo) {
            const logoElem = document.getElementById('brandLogo');
            if (logoElem) logoElem.innerHTML = `<img src="${localTrainer.photo}" alt="Personal Trainer" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            const eyebrowElem = document.getElementById('eyebrowText');
            if (eyebrowElem) eyebrowElem.textContent = localTrainer.title || 'REGIS · PERSONAL TRAINER';
        }
        renderNavigation();
        renderWorkout();
        return;
    }
    try {
        const data = await apiFetch('/student/workout');
        if (data) {
            State.workoutPlan = data.workouts || {};
            State.trainerInfo = {
                photo: data.trainer_photo,
                title: data.trainer_title || 'REGIS · PERSONAL TRAINER'
            };

            // Update UI Header Branding (Replace logo with Trainer Photo if set)
            const logoElem = document.getElementById('brandLogo');
            if (data.trainer_photo) {
                logoElem.innerHTML = `<img src="${data.trainer_photo}" alt="Personal Trainer" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            } else {
                logoElem.innerHTML = 'RGS';
            }

            document.getElementById('eyebrowText').textContent = State.trainerInfo.title;
            document.getElementById('studentNameHeader').textContent = (data.student_name || 'ALUNO').toUpperCase();
            document.getElementById('studentGoalHeader').textContent = (data.goal || 'HIPERTROFIA + DEFINIÇÃO').toUpperCase();

            updateStudentAvatarHeader();
            renderNavigation();
            renderWorkout();
        }
    } catch (err) {
        console.warn('Usando treinos padrão locais');
        const localTrainer = JSON.parse(localStorage.getItem('rgs_trainer_profile') || 'null');
        if (localTrainer && localTrainer.photo) {
            const logoElem = document.getElementById('brandLogo');
            if (logoElem) logoElem.innerHTML = `<img src="${localTrainer.photo}" alt="Personal Trainer" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
            const eyebrowElem = document.getElementById('eyebrowText');
            if (eyebrowElem) eyebrowElem.textContent = localTrainer.title || 'REGIS · PERSONAL TRAINER';
        }
        updateStudentAvatarHeader();
        renderNavigation();
        renderWorkout();
    }
}

function renderNavigation() {
    const daysContainer = document.getElementById('days');
    const dayKeys = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

    daysContainer.innerHTML = dayKeys.map(d => {
        const dayInfo = State.workoutPlan[d] || null;
        const isActive = d === State.curDay ? 'active' : '';
        const isEmpty = !dayInfo;
        return `<div class="day ${isActive} ${isEmpty ? 'day-empty' : ''}" onclick="selectDay('${d}')">
                    <b>${d}</b>
                    <span>${dayInfo ? dayInfo.title : '—'}</span>
                </div>`;
    }).join('');
}

function selectDay(d) {
    State.curDay = d;
    renderNavigation();
    renderWorkout();
}

function renderWorkout() {
    const mainContainer = document.getElementById('main');
    const dayInfo = State.workoutPlan[State.curDay] || null;

    // Empty state: no workout configured by trainer yet
    if (!dayInfo) {
        mainContainer.innerHTML = `
            <section class="hero">
                <div class="tag">${State.curDay} · SEM TREINO CONFIGURADO</div>
                <h2>Aguardando Personal</h2>
                <p>${State.user ? State.user.name.toUpperCase() : 'ALUNO'} · ${State.trainerInfo.title}</p>
            </section>
            <div class="warm" style="text-align:center; padding: 32px 16px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🏋️</div>
                <h3 style="color: var(--text-muted); font-size: 15px; font-weight: 500;">Nenhum treino configurado para ${State.curDay}</h3>
                <p style="color: var(--text-muted); font-size: 13px; margin-top: 8px;">Seu Personal Trainer em breve vai montar sua rotina. Por enquanto, descanse e hidrate-se bem!</p>
            </div>
            <div class="actions">
                <button class="btn-secondary" onclick="openHistoryModal()">📜 Meu Histórico</button>
            </div>
        `;
        return;
    }

    let exercises = [];
    if (Array.isArray(dayInfo.exercises)) {
        exercises = dayInfo.exercises.map(e => {
            if (Array.isArray(e)) return { name: e[0], sets_reps: e[1], load: e[2], tag: e[3] || '' };
            return e;
        });
    }

    const completedCount = exercises.filter((_, i) => State.studentData[`${State.curDay}_${i}`]?.done).length;
    const totalEx = exercises.length;
    const progressPercent = totalEx > 0 ? Math.round((completedCount / totalEx) * 100) : 0;
    const studentName = State.user ? State.user.name : 'Aluno';

    mainContainer.innerHTML = `
        <section class="hero">
            <div class="tag">${State.curDay} · TREINO DA SEMANA</div>
            <h2>${dayInfo.title}</h2>
            <p>${studentName} · ${State.trainerInfo.title}</p>
            <div class="stats">
                <span class="stat">⏱️ 60–90 min</span>
                <span class="stat">🏆 ${totalEx} exercícios</span>
                <span class="stat">${completedCount}/${totalEx} feitos</span>
            </div>
            <div class="progress">
                <div class="bar">
                    <div class="fill" style="width: ${progressPercent}%"></div>
                </div>
                <small><span>Progresso</span><span>${progressPercent}%</span></small>
            </div>
        </section>

        <div class="warm">
            <strong>🔥 AQUECIMENTO</strong>
            <p>${dayInfo.warmup || '5 min de aquecimento + mobilidade específica + 1 série leve do primeiro exercício.'}</p>
        </div>

        ${exercises.length > 0 ? exercises.map((e, i) => renderExerciseCard(e, i)).join('') : `
            <div class="warm"><p>Dia reservado para recuperação ativa.</p></div>
        `}

        <div class="actions" style="flex-direction: column; gap: 10px;">
            <button class="btn-primary" onclick="startTimer()">⏱️ Iniciar descanso — 90s</button>
            <button class="btn-primary" style="background: linear-gradient(135deg, #1a7a3f, #0f5c2e); border-color: #1a7a3f;" onclick="finishDayWorkout()">✅ Finalizar Treino do Dia</button>
            <button class="btn-secondary" onclick="openHistoryModal()">📜 Meu Histórico</button>
        </div>
    `;
}

function renderExerciseCard(e, i) {
    const key = `${State.curDay}_${i}`;
    const itemData = State.studentData[key] || {};
    const isDone = itemData.done;

    return `
        <article class="ex ${isDone ? 'done' : ''}">
            <div class="top">
                <div class="num">${i + 1}</div>
                <div class="name">
                    ${e.name}
                    ${e.tag ? `<div class="type">${e.tag}</div>` : ''}
                </div>
                <div class="rep">
                    ${e.sets_reps}
                    <small>SÉRIES × REP</small>
                </div>
            </div>
            <div class="fields">
                <label>Previsto<input value="${e.load || ''}" readonly></label>
                <label>Carga usada<input id="load_${key}" value="${itemData.load || ''}" placeholder="Ex.: 45 kg" onchange="saveLoad('${key}', this.value)"></label>
                <label>Descanso<input value="90 seg" readonly></label>
            </div>
            <div style="margin: 8px 0 0 0;">
                <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 4px;">📝 Observações</label>
                <textarea id="obs_${key}" rows="2"
                    style="width:100%; background:#0e0e10; border:1px solid #2a2a2e; border-radius:8px; color:#eee; font-size:12px; padding:8px; font-family:inherit; resize:vertical; box-sizing:border-box;"
                    placeholder="Ex.: senti dor no joelho, aumentei carga..."
                    onchange="saveObs('${key}', this.value)">${itemData.obs || ''}</textarea>
            </div>
            <div class="check">
                <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleExercise('${key}', this.checked)">
                Exercício concluído
            </div>
        </article>
    `;
}

function toggleExercise(key, isDone) {
    State.studentData[key] = State.studentData[key] || {};
    State.studentData[key].done = isDone;
    localStorage.setItem('rgs_workout_loads', JSON.stringify(State.studentData));
    renderWorkout();
}

function saveLoad(key, loadValue) {
    State.studentData[key] = State.studentData[key] || {};
    State.studentData[key].load = loadValue;
    localStorage.setItem('rgs_workout_loads', JSON.stringify(State.studentData));
}

function saveObs(key, obsValue) {
    State.studentData[key] = State.studentData[key] || {};
    State.studentData[key].obs = obsValue;
    localStorage.setItem('rgs_workout_loads', JSON.stringify(State.studentData));
}

async function finishDayWorkout() {
    const dayInfo = State.workoutPlan[State.curDay];
    if (!dayInfo) { showToast('Nenhum treino configurado para hoje.', 'error'); return; }

    const exercises = (dayInfo.exercises || []).map((e, i) => {
        const key = `${State.curDay}_${i}`;
        const saved = State.studentData[key] || {};
        const ex = Array.isArray(e) ? { name: e[0], sets_reps: e[1], load: e[2], tag: e[3] || '' } : e;
        return { ...ex, load_used: saved.load || '', obs: saved.obs || '', done: !!saved.done };
    });

    const payload = {
        day_code: State.curDay,
        workout_title: dayInfo.title,
        exercises_data: exercises,
        notes: ''
    };

    try {
        await apiFetch('/student/history', { method: 'POST', body: JSON.stringify(payload) });
    } catch (err) {
        const localHistory = JSON.parse(localStorage.getItem('rgs_history') || '[]');
        localHistory.unshift({ ...payload, trained_at: new Date().toISOString().split('T')[0], id: Date.now() });
        localStorage.setItem('rgs_history', JSON.stringify(localHistory));
    }

    Object.keys(State.studentData).forEach(k => { if (k.startsWith(State.curDay)) delete State.studentData[k]; });
    localStorage.setItem('rgs_workout_loads', JSON.stringify(State.studentData));
    renderWorkout();
    showToast('🏆 Treino finalizado e registrado no histórico!', 'success');
}

async function openHistoryModal() {
    openModal('historyModal');
    const container = document.getElementById('historyList');
    container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:24px;">Carregando...</p>';

    let history = [];
    try {
        history = await apiFetch('/student/history');
    } catch (err) {
        history = JSON.parse(localStorage.getItem('rgs_history') || '[]');
    }

    if (!history || history.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:24px;">Nenhum treino registrado ainda.<br>Finalize seu primeiro treino!</p>';
        return;
    }

    container.innerHTML = history.map(h => {
        const exs = Array.isArray(h.exercises_data) ? h.exercises_data : (typeof h.exercises_data === 'string' ? JSON.parse(h.exercises_data) : []);
        const doneCount = exs.filter(e => e.done).length;
        const dateStr = h.trained_at ? new Date(h.trained_at + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data desconhecida';
        return `
            <div style="background:#141416; border:1px solid #2a2a2e; border-radius:12px; padding:14px; margin-bottom:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px;">
                    <div>
                        <strong style="color:#fff; font-size:14px;">${h.workout_title || h.day_code}</strong>
                        <div style="font-size:11px; color:var(--primary-red); font-weight:600; margin-top:2px;">${h.day_code} · ${dateStr}</div>
                    </div>
                    <span style="background:#163625; color:#4bc58b; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; white-space:nowrap;">${doneCount}/${exs.length} feitos</span>
                </div>
                ${exs.filter(e => e.done || e.load_used || e.obs).map(e => `
                    <div style="border-top:1px solid #222; padding:6px 0; font-size:12px;">
                        <span style="color:#eee;">${e.name}</span>
                        ${e.load_used ? `<span style="color:var(--accent-gold); margin-left:8px;">Carga: ${e.load_used}</span>` : ''}
                        ${e.obs ? `<div style="color:#aaa; font-size:11px; margin-top:3px;">📝 ${e.obs}</div>` : ''}
                    </div>
                `).join('')}
                ${h.notes ? `<div style="margin-top:8px; font-size:12px; color:#aaa; border-top:1px solid #222; padding-top:6px;">💬 ${h.notes}</div>` : ''}
            </div>
        `;
    }).join('');
}


// -------------------------------------------------------------
// 5. Rest Timer Overlay & Vibration
// -------------------------------------------------------------
function startTimer() {
    let seconds = 90;
    if (State.timerInterval) clearInterval(State.timerInterval);

    const timerElem = document.getElementById('timer');
    const clockElem = document.getElementById('clock');
    timerElem.classList.add('show');

    State.timerInterval = setInterval(() => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        clockElem.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (seconds-- <= 0) {
            clearInterval(State.timerInterval);
            if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
            showToast('Tempo de descanso finalizado! Bora para a próxima série!', 'success');
        }
    }, 1000);
}

function closeTimer() {
    if (State.timerInterval) clearInterval(State.timerInterval);
    document.getElementById('timer').classList.remove('show');
}

// -------------------------------------------------------------
// 6. Student Profile & 2FA Manager
// -------------------------------------------------------------
const Profile = {
    async update(firstName, lastName, photo_base64) {
        const cleanFirst = (firstName || '').trim();
        const cleanLast = (lastName || '').trim();
        if (!cleanFirst) {
            showToast('Por favor, informe seu nome.', 'error');
            return;
        }

        const fullName = cleanLast ? `${cleanFirst} ${cleanLast}` : cleanFirst;

        try {
            if (State.token) {
                await apiFetch('/student/profile', {
                    method: 'POST',
                    body: JSON.stringify({ name: fullName, photo_url: photo_base64 })
                });
            }
            if (State.user) {
                State.user.name = fullName;
                localStorage.setItem('rgs_user', JSON.stringify(State.user));
            }
            showToast('Perfil atualizado com sucesso!', 'success');
            updateStudentAvatarHeader();
            closeModal('profileModal');
        } catch (err) {
            console.warn('Atualizando perfil localmente:', err.message);
            if (State.user) {
                State.user.name = fullName;
                localStorage.setItem('rgs_user', JSON.stringify(State.user));
            }
            showToast('Perfil atualizado com sucesso!', 'success');
            updateStudentAvatarHeader();
            closeModal('profileModal');
        }
    },

    load() {
        if (!State.user || !State.user.name) return;
        const parts = State.user.name.trim().split(' ').filter(Boolean);
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        const firstElem = document.getElementById('profFirstName');
        if (firstElem) firstElem.value = firstName;

        const lastElem = document.getElementById('profLastName');
        if (lastElem) lastElem.value = lastName;
    },

    async setup2FA() {
        try {
            const data = await apiFetch('/auth/2fa/setup', { method: 'POST' });
            document.getElementById('2faQrContainer').innerHTML = `<img src="${data.qrCode}" alt="QR Code 2FA" style="max-width:180px; border-radius:8px;">`;
            document.getElementById('2faSecretKey').textContent = `Chave manual: ${data.secret}`;
            document.getElementById('2faSetupStep').style.display = 'block';
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    async verify2FA(token) {
        try {
            const data = await apiFetch('/auth/2fa/verify', {
                method: 'POST',
                body: JSON.stringify({ token })
            });
            showToast(data.message, 'success');
            document.getElementById('2faSetupStep').style.display = 'none';
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
};

// -------------------------------------------------------------
// 7. Personal Trainer CMS Manager
// -------------------------------------------------------------
const CMS = {
    async loadStudents() {
        try {
            const students = await apiFetch('/trainer/students');
            const container = document.getElementById('cmsStudentsList');

            if (!students || students.length === 0) {
                container.innerHTML = '<p class="text-muted">Nenhum aluno cadastrado ainda.</p>';
                return;
            }

            container.innerHTML = students.map(s => `
                <div class="student-card">
                    <div class="student-info">
                        <h4>${s.name}</h4>
                        <p>${s.email} · ${s.goal || 'Sem ficha preenchida'}</p>
                    </div>
                    <div>
                        <span class="status-badge ${s.is_active ? 'status-active' : 'status-blocked'}">
                            ${s.is_active ? 'Ativo' : 'Bloqueado'}
                        </span>
                        <button class="btn-secondary" style="padding:4px 8px; font-size:11px; margin-left:6px;"
                                onclick="CMS.toggleUserStatus(${s.id}, ${!s.is_active})">
                            ${s.is_active ? 'Bloquear' : 'Ativar'}
                        </button>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            showToast('Erro ao carregar alunos no CMS.', 'error');
        }
    },

    async toggleUserStatus(studentId, isActive) {
        try {
            await apiFetch(`/trainer/students/${studentId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: isActive })
            });
            showToast(`Status do aluno alterado com sucesso!`, 'success');
            CMS.loadStudents();
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    async loadTrainerProfile() {
        try {
            const profile = await apiFetch('/trainer/profile');
            if (profile) {
                document.getElementById('cmsTrainerName').value = profile.display_name || '';
                document.getElementById('cmsTrainerTitle').value = profile.title || '';
                document.getElementById('cmsTrainerBio').value = profile.bio || '';
                if (profile.photo_url) {
                    document.getElementById('cmsTrainerPhotoPreview').innerHTML = `<img src="${profile.photo_url}" alt="Trainer Avatar">`;
                }
            }
        } catch (err) {
            console.error('Erro ao carregar perfil do personal:', err);
        }
    },

    async saveTrainerProfile(display_name, title, bio, photo_url) {
        try {
            await apiFetch('/trainer/profile', {
                method: 'PUT',
                body: JSON.stringify({ display_name, title, bio, photo_url })
            });
            showToast('Perfil do Personal Trainer atualizado! A foto de perfil agora aparecerá na tela inicial dos alunos.', 'success');
            loadStudentWorkout();
        } catch (err) {
            showToast(err.message, 'error');
        }
    },

    async loadExercises() {
        try {
            const exercises = await apiFetch('/trainer/exercises');
            const container = document.getElementById('cmsExercisesList');
            const selectElem = document.getElementById('workoutExPicker');

            container.innerHTML = exercises.map(ex => `
                <div style="background:#1a1a1c; padding:8px 12px; border-radius:6px; margin-bottom:6px; display:flex; justify-content:space-between;">
                    <div><strong>${ex.name}</strong> <small style="color:#aaa">(${ex.category})</small></div>
                    <small style="color:var(--primary-red); font-weight:bold">${ex.default_sets_reps}</small>
                </div>
            `).join('');

            if (selectElem) {
                selectElem.innerHTML = exercises.map(ex => `<option value="${ex.name}">${ex.name} (${ex.category})</option>`).join('');
            }
        } catch (err) {
            console.error('Erro ao carregar exercícios:', err);
        }
    },

    async addExercise(name, category, default_sets_reps, default_load) {
        try {
            await apiFetch('/trainer/exercises', {
                method: 'POST',
                body: JSON.stringify({ name, category, default_sets_reps, default_load })
            });
            showToast('Exercício cadastrado no acervo!', 'success');
            CMS.loadExercises();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }
};

// -------------------------------------------------------------
// UI Helpers: Modals & Toasts
// -------------------------------------------------------------
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
    if (modalId === 'profileModal') {
        Profile.load();
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function switchTab(tabGroup, selectedTabId) {
    document.querySelectorAll(`.${tabGroup}-content`).forEach(el => el.style.display = 'none');
    document.querySelectorAll(`.${tabGroup}-btn`).forEach(el => el.classList.remove('active'));

    document.getElementById(selectedTabId).style.display = 'block';
    event.target.classList.add('active');
}

function showToast(message, type = 'info') {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = 'position:fixed; top:20px; right:20px; z-index:9999; display:flex; flex-direction:column; gap:8px;';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    const bg = type === 'success' ? '#163625' : type === 'error' ? '#3b1c1e' : '#202024';
    const border = type === 'success' ? '#4bc58b' : type === 'error' ? '#e94b50' : '#e7bd55';

    toast.style.cssText = `background:${bg}; border:1px solid ${border}; color:#fff; padding:12px 16px; border-radius:10px; font-size:13px; font-weight:500; box-shadow:0 6px 18px rgba(0,0,0,0.4); min-width:240px; transition:all 0.3s ease;`;
    toast.textContent = message;

    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Convert File to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// -------------------------------------------------------------
// Application Initialization & Popover Dropdown Controller
// -------------------------------------------------------------
function getInitials(name) {
    if (!name) return 'A';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function updateStudentAvatarHeader() {
    let studentName = '';
    let studentEmail = '';

    if (State.user && State.user.name) {
        studentName = State.user.name;
        studentEmail = State.user.email || 'aluno@app.com';
    } else {
        const headerNameElem = document.getElementById('studentNameHeader');
        if (headerNameElem && headerNameElem.textContent && headerNameElem.textContent !== '...') {
            studentName = headerNameElem.textContent.trim();
        }
    }

    if (studentName) {
        const initials = getInitials(studentName);
        const initialsElem = document.getElementById('userInitials');
        if (initialsElem) initialsElem.textContent = initials;

        const dropdownName = document.getElementById('dropdownUserName');
        if (dropdownName) dropdownName.textContent = studentName;

        const dropdownEmail = document.getElementById('dropdownUserEmail');
        if (dropdownEmail) dropdownEmail.textContent = studentEmail;

        const headerNameElem = document.getElementById('studentNameHeader');
        if (headerNameElem) headerNameElem.textContent = studentName.toUpperCase();
    }
}

function toggleUserDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById('userDropdownMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

function closeUserDropdown() {
    const menu = document.getElementById('userDropdownMenu');
    if (menu) {
        menu.classList.remove('active');
    }
}

function initApp() {
    if (!State.token) {
        openModal('authModal');
    } else {
        updateStudentAvatarHeader();
        loadStudentWorkout();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();

    // Close floating user dropdown on outside click
    document.addEventListener('click', (e) => {
        const userMenu = document.querySelector('.header-user-menu');
        if (userMenu && !userMenu.contains(e.target)) {
            closeUserDropdown();
        }
    });

    // Password strength event listener for registration
    const regPassInput = document.getElementById('regPassword');
    if (regPassInput) {
        regPassInput.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value, 'regStrengthFill', 'regStrengthText', 'regPasswordRules');
        });
    }

    // Password strength event listener for profile change
    const newPassInput = document.getElementById('profileNewPassword');
    if (newPassInput) {
        newPassInput.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value, 'profStrengthFill', 'profStrengthText');
        });
    }

    // Avatar Upload Listener for CMS Trainer Profile
    const cmsPhotoInput = document.getElementById('cmsPhotoFileInput');
    if (cmsPhotoInput) {
        cmsPhotoInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const base64 = await fileToBase64(e.target.files[0]);
                document.getElementById('cmsTrainerPhotoPreview').innerHTML = `<img src="${base64}" alt="Trainer Avatar">`;
                document.getElementById('cmsPhotoBase64').value = base64;
            }
        });
    }
});
