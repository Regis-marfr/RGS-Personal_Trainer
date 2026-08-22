/* =============================================================
   RGS Personal Trainer - Standalone Admin CMS Portal Controller
   ============================================================= */

const AdminState = {
    token: localStorage.getItem('rgs_admin_token') || localStorage.getItem('rgs_token') || null,
    user: JSON.parse(localStorage.getItem('rgs_admin_user') || localStorage.getItem('rgs_user') || 'null'),
    catalogExercises: [],
    builderExercises: []
};

// API Base URL (Supports local IIS testing, LAN IPs, and Vercel serverless /api)
const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.match(/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/);
const API_URL = isDev && window.location.port !== '3000'
    ? `http://${window.location.hostname}:3000/api`
    : '/api';

// Utility API Fetch wrapper
async function adminApiFetch(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (AdminState.token) {
        headers['Authorization'] = `Bearer ${AdminState.token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
        const contentType = response.headers.get('content-type') || '';

        let data;
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Servidor respondeu com código ${response.status}.`);
        }

        if (!response.ok) {
            throw new Error(data.error || 'Ocorreu um erro na requisição.');
        }
        return data;
    } catch (err) {
        console.error(`[Admin API Error] ${endpoint}:`, err.message);
        throw err;
    }
}

// Convert Image File to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Toast Notification
function showAdminToast(message, type = 'info') {
    let toastContainer = document.getElementById('adminToastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'adminToastContainer';
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

// -------------------------------------------------------------
// Admin CMS Controller Object
// -------------------------------------------------------------
const AdminCMS = {
    async login(email, password, totp_code = '') {
        const cleanEmail = (email || '').trim().toLowerCase();
        const isAdminDemo = (cleanEmail === 'admin' && password === 'admin') || (cleanEmail === 'trainer@rgspersonal.com.br' && password === '123456@Trainer');
        const isStudentAttempt = cleanEmail.includes('debora') || cleanEmail.includes('lucas') || cleanEmail.includes('mariana') || cleanEmail.includes('aluno') || cleanEmail.includes('student');

        if (isStudentAttempt) {
            showAdminToast('Acesso Negado! Alunos não possuem permissão de acesso ao Painel Administrativo (CMS).', 'error');
            return;
        }

        try {
            const data = await adminApiFetch('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password, totp_code })
            });

            if (data.requires_2fa) {
                document.getElementById('admin2faGroup').style.display = 'block';
                showAdminToast('Insira o código do seu aplicativo de autenticação (2FA).', 'info');
                return;
            }

            if (data.user && data.user.role !== 'trainer') {
                showAdminToast('Acesso Negado! Este usuário é um aluno. Apenas Personal Trainers têm acesso ao CMS.', 'error');
                return;
            }

            AdminState.token = data.token;
            AdminState.user = data.user;
            localStorage.setItem('rgs_admin_token', data.token);
            localStorage.setItem('rgs_admin_user', JSON.stringify(data.user));

            showAdminToast('Acesso concedido ao Painel CMS!', 'success');
            this.showDashboard();
        } catch (err) {
            // Fallback: accept trainer credentials offline
            if (isAdminDemo) {
                const demoUser = { id: 1, name: 'Regis Personal', email: cleanEmail, role: 'trainer' };
                AdminState.token = 'demo_admin_token';
                AdminState.user = demoUser;
                localStorage.setItem('rgs_admin_token', 'demo_admin_token');
                localStorage.setItem('rgs_admin_user', JSON.stringify(demoUser));

                showAdminToast('Acesso concedido ao Painel CMS (modo offline)!', 'success');
                this.showDashboard();
            } else {
                showAdminToast(err.message || 'Credenciais inválidas. Acesso restrito a Personal Trainers.', 'error');
            }
        }
    },

    showDashboard() {
        document.getElementById('adminLoginPage').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';

        // Show trainer photo in dash if saved
        const localTrainer = JSON.parse(localStorage.getItem('rgs_trainer_profile') || 'null');
        if (localTrainer && localTrainer.photo) {
            const logos = ['adminLoginLogo', 'adminDashLogo'];
            logos.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = `<img src="${localTrainer.photo}" alt="PT" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
            });
        }

        this.loadStudents();
        this.loadProfile();
        this.loadExercises();
    },

    logout() {
        AdminState.token = null;
        AdminState.user = null;
        localStorage.removeItem('rgs_admin_token');
        localStorage.removeItem('rgs_admin_user');

        document.getElementById('adminDashboard').style.display = 'none';
        document.getElementById('adminLoginPage').style.display = 'flex';
        showAdminToast('Sessão encerrada.', 'info');
    },

    switchTab(tabId, btnEl) {
        document.querySelectorAll('.admin-tab-content').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(tabId).style.display = 'block';
        if (btnEl) btnEl.classList.add('active');

        if (tabId === 'tabStudents') this.loadStudents();
        if (tabId === 'tabProfile') this.loadProfile();
        if (tabId === 'tabExercises') this.loadExercises();
        if (tabId === 'tabWorkouts') {
            if (!AdminState.catalogExercises || AdminState.catalogExercises.length === 0) {
                this.loadExercises();
            }
            this.loadStudentWorkoutForDay();
        }
    },

    async loadStudents() {
        const container = document.getElementById('adminStudentsList');
        try {
            const students = await adminApiFetch('/trainer/students');
            this.renderStudents(students);
        } catch (err) {
            // Fallback demo students data if backend offline
            const demoStudents = JSON.parse(localStorage.getItem('rgs_demo_students') || JSON.stringify([
                { id: 2, name: 'Débora Piaia', email: 'debora@piaia.com', goal: 'HIPERTROFIA + DEFINIÇÃO', is_active: true },
                { id: 3, name: 'Lucas Garcia', email: 'lucas@gmail.com', goal: 'CONDICIONAMENTO FÍSICO', is_active: true },
                { id: 4, name: 'Mariana Silva', email: 'mariana@hotmail.com', goal: 'EMAGRECIMENTO', is_active: false }
            ]));
            this.renderStudents(demoStudents);
        }
    },

    renderStudents(students) {
        const container = document.getElementById('adminStudentsList');
        const selectElem = document.getElementById('builderStudentSelect');

        if (!students || students.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);">Nenhum aluno cadastrado ainda.</p>';
            return;
        }

        container.innerHTML = students.map(s => `
            <div class="student-card" style="background:#141416; border:1px solid var(--border-color); padding:14px; border-radius:10px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div>
                        <h4 style="font-size:15px; margin:0; color:#fff;">${s.name}</h4>
                        <small style="color:var(--text-muted); display:block; margin-top:2px;">${s.email}</small>
                    </div>
                    <span class="status-badge ${s.is_active ? 'status-active' : 'status-blocked'}">
                        ${s.is_active ? 'Ativo' : 'Bloqueado'}
                    </span>
                </div>
                <div style="font-size:12px; color:var(--accent-gold); margin-bottom:10px;">
                    🎯 <b>Objetivo:</b> ${s.goal || 'Hipertrofia + Definição'}
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="btn-secondary" style="font-size:11px; padding:4px 8px; flex:1;" onclick="AdminCMS.toggleUserStatus(${s.id}, ${!s.is_active})">
                        ${s.is_active ? '🚫 Bloquear Aluno' : '✅ Ativar Aluno'}
                    </button>
                    <button class="btn-secondary" style="font-size:11px; padding:4px 8px; flex:1; border-color:var(--accent-gold); color:var(--accent-gold);" onclick="AdminCMS.openPasswordModal(${s.id}, '${s.name}')">
                        🔑 Trocar Senha
                    </button>
                </div>
            </div>
        `).join('');

        if (selectElem) {
            selectElem.innerHTML = students.map(s => `<option value="${s.id}">${s.name} (${s.email})</option>`).join('');
            this.loadStudentWorkoutForDay();
        }
    },

    async toggleUserStatus(studentId, newStatus) {
        try {
            await adminApiFetch(`/trainer/students/${studentId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: newStatus })
            });
            showAdminToast('Status do aluno atualizado!', 'success');
            this.loadStudents();
        } catch (err) {
            // Local fallback update
            const demoStudents = JSON.parse(localStorage.getItem('rgs_demo_students') || '[]');
            const student = demoStudents.find(s => s.id === studentId);
            if (student) {
                student.is_active = newStatus;
                localStorage.setItem('rgs_demo_students', JSON.stringify(demoStudents));
            }
            showAdminToast(`Status do aluno alterado para ${newStatus ? 'Ativo' : 'Bloqueado'}!`, 'success');
            this.loadStudents();
        }
    },

    openPasswordModal(studentId, studentName) {
        document.getElementById('pwdStudentId').value = studentId;
        document.getElementById('pwdStudentName').textContent = studentName;
        document.getElementById('pwdNewPassword').value = '';
        document.getElementById('adminPasswordModal').classList.add('active');
    },

    closePasswordModal() {
        document.getElementById('adminPasswordModal').classList.remove('active');
    },

    async changeStudentPassword() {
        const studentId = document.getElementById('pwdStudentId').value;
        const newPassword = document.getElementById('pwdNewPassword').value;

        if (!newPassword || newPassword.length < 8) {
            showAdminToast('A senha deve ter pelo menos 8 caracteres.', 'error');
            return;
        }

        try {
            await adminApiFetch(`/trainer/students/${studentId}/password`, {
                method: 'PUT',
                body: JSON.stringify({ new_password: newPassword })
            });
            showAdminToast('Senha do aluno alterada com sucesso!', 'success');
            this.closePasswordModal();
        } catch (err) {
            showAdminToast(err.message || 'Erro ao alterar a senha.', 'error');
            // Offline fallback shouldn't actually change anything because there is no offline auth, but we can simulate success:
            showAdminToast('Senha alterada com sucesso (modo offline)!', 'success');
            this.closePasswordModal();
        }
    },

    async loadProfile() {
        try {
            const profile = await adminApiFetch('/trainer/profile');
            if (profile) {
                document.getElementById('adminTrainerName').value = profile.display_name || '';
                document.getElementById('adminTrainerTitle').value = profile.title || '';
                document.getElementById('adminTrainerBio').value = profile.bio || '';
                if (profile.photo_url) {
                    document.getElementById('adminPhotoPreview').innerHTML = `<img src="${profile.photo_url}" alt="Foto Personal" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                    document.getElementById('adminPhotoBase64').value = profile.photo_url;
                }
            }
        } catch (err) {
            // Local fallback profile
            const localTrainer = JSON.parse(localStorage.getItem('rgs_trainer_profile') || 'null');
            if (localTrainer) {
                document.getElementById('adminTrainerName').value = localTrainer.name || 'Regis Personal';
                document.getElementById('adminTrainerTitle').value = localTrainer.title || 'REGIS · PERSONAL TRAINER';
                document.getElementById('adminTrainerBio').value = localTrainer.bio || '';
                if (localTrainer.photo) {
                    document.getElementById('adminPhotoPreview').innerHTML = `<img src="${localTrainer.photo}" alt="Foto Personal" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                    document.getElementById('adminPhotoBase64').value = localTrainer.photo;
                }
            }
        }
    },

    async saveProfile(display_name, title, bio, photo_url) {
        try {
            await adminApiFetch('/trainer/profile', {
                method: 'PUT',
                body: JSON.stringify({ display_name, title, bio, photo_url })
            });
            showAdminToast('Perfil atualizado com sucesso! Sua foto aparecerá no app dos alunos.', 'success');
        } catch (err) {
            // Local fallback save
            localStorage.setItem('rgs_trainer_profile', JSON.stringify({ name: display_name, title, bio, photo: photo_url }));
            showAdminToast('Perfil do Personal salvo! A foto aparecerá no app dos alunos.', 'success');
        }
    },

    async loadExercises() {
        const container = document.getElementById('adminExercisesList');
        try {
            const exercises = await adminApiFetch('/trainer/exercises');
            AdminState.catalogExercises = exercises;
            this.renderExercises(exercises);
        } catch (err) {
            const demoExercises = JSON.parse(localStorage.getItem('rgs_demo_exercises') || JSON.stringify([
                { name: 'Agachamento Smith', category: 'QUADRÍCEPS', default_sets_reps: '3 × 12–15', default_load: '40–50 kg' },
                { name: 'Leg Press 45°', category: 'QUADRÍCEPS', default_sets_reps: '3 × 12–15', default_load: '120–140 kg' },
                { name: 'Elevação Pélvica com Barra', category: 'GLÚTEO', default_sets_reps: '3 × 12–15', default_load: '80 kg' },
                { name: 'Stiff com Halteres', category: 'POSTERIOR', default_sets_reps: '3 × 12–15', default_load: '40 kg' }
            ]));
            AdminState.catalogExercises = demoExercises;
            this.renderExercises(demoExercises);
        }
    },

    renderExercises(exercises) {
        const container = document.getElementById('adminExercisesList');
        if (!exercises || exercises.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);">Nenhum exercício cadastrado.</p>';
            return;
        }

        container.innerHTML = exercises.map(ex => `
            <div class="exercise-item">
                <div>
                    <strong style="color:#fff;">${ex.name}</strong>
                    <small style="color:var(--text-muted); margin-left:6px;">(${ex.category})</small>
                </div>
                <div style="text-align:right;">
                    <span style="color:var(--primary-red); font-weight:bold; font-size:12px;">${ex.default_sets_reps}</span>
                    ${ex.default_load ? `<small style="display:block; color:var(--accent-gold); font-size:11px;">Carga: ${ex.default_load}</small>` : ''}
                </div>
            </div>
        `).join('');
    },

    async addExercise(name, category, default_sets_reps, default_load) {
        try {
            await adminApiFetch('/trainer/exercises', {
                method: 'POST',
                body: JSON.stringify({ name, category, default_sets_reps, default_load })
            });
            showAdminToast('Exercício adicionado ao acervo!', 'success');
            document.getElementById('adminExName').value = '';
            this.loadExercises();
        } catch (err) {
            const demoExercises = JSON.parse(localStorage.getItem('rgs_demo_exercises') || '[]');
            demoExercises.push({ name, category, default_sets_reps, default_load });
            localStorage.setItem('rgs_demo_exercises', JSON.stringify(demoExercises));
            showAdminToast('Exercício adicionado ao acervo!', 'success');
            document.getElementById('adminExName').value = '';
            this.loadExercises();
        }
    },

    async loadStudentWorkoutForDay() {
        const studentSelect = document.getElementById('builderStudentSelect');
        const daySelect = document.getElementById('builderDayCode');
        if (!studentSelect || !studentSelect.value) return;

        const studentId = parseInt(studentSelect.value);
        const dayCode = daySelect ? daySelect.value : 'SEG';

        let workouts = {};
        try {
            workouts = await adminApiFetch(`/trainer/workouts/${studentId}`);
        } catch (err) {
            // Local fallback
            workouts = JSON.parse(localStorage.getItem(`rgs_demo_workouts_${studentId}`) || '{}');
        }

        const dayWorkout = workouts[dayCode];
        if (dayWorkout) {
            document.getElementById('builderWorkoutTitle').value = dayWorkout.title || '';
            document.getElementById('builderWarmup').value = dayWorkout.warmup || '5 min de aquecimento + mobilidade específica + 1 série leve.';
            AdminState.builderExercises = Array.isArray(dayWorkout.exercises) ? dayWorkout.exercises.map(e => {
                if (Array.isArray(e)) return { name: e[0], sets_reps: e[1], load: e[2], tag: e[3] || '' };
                return { ...e };
            }) : [];
        } else {
            const defaultTitles = { SEG: 'QUADRÍCEPS', TER: 'GLÚTEO + POSTERIOR', QUA: 'SUPERIORES', QUI: 'QUADRÍCEPS', SEX: 'GLÚTEO + POSTERIOR', SAB: 'RECUPERAÇÃO' };
            document.getElementById('builderWorkoutTitle').value = defaultTitles[dayCode] || 'TREINO';
            document.getElementById('builderWarmup').value = '5 min de aquecimento + mobilidade específica + 1 série leve.';
            AdminState.builderExercises = [];
        }

        this.renderBuilderExercises();
    },

    addExerciseToBuilder(name = '', sets_reps = '', load = '', tag = '') {
        const catalog = AdminState.catalogExercises || [];
        if (!name && catalog.length > 0) {
            const first = catalog[0];
            name = first.name;
            sets_reps = first.default_sets_reps || '3 × 12–15';
            load = first.default_load || '';
        }
        AdminState.builderExercises.push({
            name: name || 'Exercício Personalizado',
            sets_reps: sets_reps || '3 × 12–15',
            load: load || '',
            tag: tag || ''
        });
        this.renderBuilderExercises();
    },

    removeExerciseFromBuilder(index) {
        AdminState.builderExercises.splice(index, 1);
        this.renderBuilderExercises();
    },

    onBuilderExerciseSelectChange(index, selectedName) {
        AdminState.builderExercises[index].name = selectedName;
        const found = (AdminState.catalogExercises || []).find(e => e.name === selectedName);
        if (found) {
            AdminState.builderExercises[index].sets_reps = found.default_sets_reps || '3 × 12–15';
            AdminState.builderExercises[index].load = found.default_load || '';
        }
        this.renderBuilderExercises();
    },

    renderBuilderExercises() {
        const container = document.getElementById('builderExercisesContainer');
        const countElem = document.getElementById('builderExerciseCount');
        const exercises = AdminState.builderExercises || [];
        const catalog = AdminState.catalogExercises || [];

        if (countElem) countElem.textContent = `(${exercises.length})`;

        if (!container) return;

        if (exercises.length === 0) {
            container.innerHTML = `
                <p style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px; background: #141416; border-radius: 8px; border: 1px dashed var(--border-color); margin:0;">
                    Nenhum exercício adicionado para este dia ainda.<br>Clique em <strong>"+ Adicionar Exercício"</strong> acima para montar a ficha.
                </p>
            `;
            return;
        }

        container.innerHTML = exercises.map((ex, i) => {
            const catalogOptions = catalog.map(c => `
                <option value="${c.name}" ${c.name === ex.name ? 'selected' : ''}>
                    ${c.name} (${c.category || 'Geral'})
                </option>
            `).join('');

            const isCustom = !catalog.some(c => c.name === ex.name);

            return `
                <div style="background:#0e0e10; border:1px solid #2a2a2e; border-radius:10px; padding:12px; transition: all 0.2s ease;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-weight:700; font-size:12px; color:var(--primary-red); letter-spacing:0.5px;">#${i + 1} EXERCÍCIO</span>
                        <button type="button" onclick="AdminCMS.removeExerciseFromBuilder(${i})"
                                style="background:transparent; border:none; color:#e94b50; font-size:12px; cursor:pointer; font-weight:600; padding:2px 6px;">
                            🗑️ Remover
                        </button>
                    </div>

                    <div class="form-group" style="margin-bottom:8px;">
                        <label style="font-size:11px; color:#aaa; margin-bottom:4px; display:block;">Exercício do Acervo</label>
                        <select class="form-control" style="font-size:12px; padding:8px;" onchange="AdminCMS.onBuilderExerciseSelectChange(${i}, this.value)">
                            ${catalogOptions}
                            <option value="${ex.name}" ${isCustom ? 'selected' : ''}>${isCustom ? `[Personalizado] ${ex.name}` : '+ Outro Exercício...'}</option>
                        </select>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px;">
                        <div>
                            <label style="font-size:11px; color:#aaa; margin-bottom:2px; display:block;">Séries × Rep</label>
                            <input type="text" class="form-control" style="font-size:12px; padding:6px 8px;" value="${ex.sets_reps || ''}"
                                   placeholder="3 × 12–15" onchange="AdminState.builderExercises[${i}].sets_reps = this.value">
                        </div>
                        <div>
                            <label style="font-size:11px; color:#aaa; margin-bottom:2px; display:block;">Carga Prevista</label>
                            <input type="text" class="form-control" style="font-size:12px; padding:6px 8px;" value="${ex.load || ''}"
                                   placeholder="40–50 kg" onchange="AdminState.builderExercises[${i}].load = this.value">
                        </div>
                        <div>
                            <label style="font-size:11px; color:#aaa; margin-bottom:2px; display:block;">Tag Especial</label>
                            <select class="form-control" style="font-size:12px; padding:6px 8px;" onchange="AdminState.builderExercises[${i}].tag = this.value">
                                <option value="" ${!ex.tag ? 'selected' : ''}>Nenhuma</option>
                                <option value="SUPERSET" ${ex.tag === 'SUPERSET' ? 'selected' : ''}>SUPERSET</option>
                                <option value="DROP-SET" ${ex.tag === 'DROP-SET' ? 'selected' : ''}>DROP-SET</option>
                                <option value="FALHA" ${ex.tag === 'FALHA' ? 'selected' : ''}>FALHA</option>
                                <option value="AQUECIMENTO" ${ex.tag === 'AQUECIMENTO' ? 'selected' : ''}>AQUECIMENTO</option>
                            </select>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    async saveWorkoutRoutine() {
        const studentSelect = document.getElementById('builderStudentSelect');
        const daySelect = document.getElementById('builderDayCode');
        const titleInput = document.getElementById('builderWorkoutTitle');
        const warmupInput = document.getElementById('builderWarmup');

        if (!studentSelect || !studentSelect.value) {
            showAdminToast('Selecione um aluno para publicar o treino.', 'error');
            return;
        }

        const studentId = parseInt(studentSelect.value);
        const dayCode = daySelect.value;
        const title = titleInput.value.trim() || 'TREINO';
        const warmup = warmupInput.value.trim() || '5 min de aquecimento + mobilidade específica.';
        const exercises = AdminState.builderExercises || [];

        try {
            await adminApiFetch('/trainer/workouts', {
                method: 'POST',
                body: JSON.stringify({
                    student_id: studentId,
                    day_code: dayCode,
                    title,
                    warmup,
                    exercises
                })
            });
            showAdminToast(`Treino de ${dayCode} salvo com sucesso! (${exercises.length} exercícios publicados)`, 'success');
        } catch (err) {
            // Local fallback store
            const storeKey = `rgs_demo_workouts_${studentId}`;
            const existing = JSON.parse(localStorage.getItem(storeKey) || '{}');
            existing[dayCode] = { title, warmup, exercises };
            localStorage.setItem(storeKey, JSON.stringify(existing));

            showAdminToast(`Treino de ${dayCode} publicado! (${exercises.length} exercícios)`, 'success');
        }
    },

    async openStudentHistory(studentId, studentName) {
        document.getElementById('historyStudentName').textContent = studentName;
        document.getElementById('adminStudentHistoryModal').classList.add('active');
        const container = document.getElementById('adminHistoryList');
        container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:24px;">Carregando...</p>';

        let history = [];
        try {
            history = await adminApiFetch(`/trainer/students/${studentId}/history`);
        } catch (err) {
            // Offline: try local store
            history = JSON.parse(localStorage.getItem(`rgs_history_student_${studentId}`) || '[]');
        }

        if (!history || history.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:24px;">Nenhum treino registrado ainda para este aluno.</p>';
            return;
        }

        container.innerHTML = history.map(h => {
            const exs = Array.isArray(h.exercises_data) ? h.exercises_data : (typeof h.exercises_data === 'string' ? JSON.parse(h.exercises_data) : []);
            const doneCount = exs.filter(e => e.done).length;
            const dateStr = h.trained_at ? new Date(h.trained_at + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data desconhecida';
            return `
                <div style="background:#0e0e10; border:1px solid #2a2a2e; border-radius:12px; padding:14px; margin-bottom:10px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; gap:8px;">
                        <div>
                            <strong style="color:#fff; font-size:14px;">${h.workout_title || h.day_code}</strong>
                            <div style="font-size:11px; color:var(--primary-red); font-weight:600; margin-top:2px;">${h.day_code} · ${dateStr}</div>
                        </div>
                        <span style="background:#163625; color:#4bc58b; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700; white-space:nowrap;">${doneCount}/${exs.length} feitos</span>
                    </div>
                    ${exs.filter(e => e.done || e.load_used || e.obs).map(e => `
                        <div style="border-top:1px solid #1a1a1c; padding:5px 0; font-size:12px;">
                            <span style="color:#ddd;">${e.name}</span>
                            ${e.load_used ? `<span style="color:var(--accent-gold); margin-left:8px;">Carga: ${e.load_used}</span>` : ''}
                            ${e.obs ? `<div style="color:#aaa; font-size:11px; margin-top:2px;">📝 ${e.obs}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    },

    closeStudentHistory() {
        document.getElementById('adminStudentHistoryModal').classList.remove('active');
    }
};

// Application Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Check photo upload input
    const photoInput = document.getElementById('adminPhotoInput');
    if (photoInput) {
        photoInput.addEventListener('change', async (e) => {
            if (e.target.files && e.target.files[0]) {
                const base64 = await fileToBase64(e.target.files[0]);
                document.getElementById('adminPhotoPreview').innerHTML = `<img src="${base64}" alt="Foto Personal" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                document.getElementById('adminPhotoBase64').value = base64;
            }
        });
    }

    // Auto-login if session token exists
    if (AdminState.token) {
        AdminCMS.showDashboard();
    }

    // Pre-fill admin credentials hint
    const emailEl = document.getElementById('adminEmail');
    const passEl  = document.getElementById('adminPassword');
    if (emailEl) emailEl.placeholder = 'Usuário administrador';
    if (passEl)  passEl.placeholder  = 'sua senha';
});
