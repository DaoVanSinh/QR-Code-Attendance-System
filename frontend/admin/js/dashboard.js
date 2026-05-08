// ═══════════════════════════════════════════════════════════════
// Admin Dashboard — Tổng Quan Hệ Thống
// ═══════════════════════════════════════════════════════════════

let _allUsers = [];
let _currentTab = 'STUDENT';
let _editingUserId = null;
let _editingUserEmail = '';

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadDashboard();
});

// ── Dashboard Stats ──────────────────────────────────────────
async function loadDashboardStats() {
    try {
        const res = await authFetch(`${API_BASE_URL}/admin/dashboard/stats`);
        if (!res.ok) return;
        const d = await res.json();

        // Stat cards — count-up animation
        animateCount('statStudents', d.totalStudents);
        animateCount('statTeachers', d.totalTeachers);
        animateCount('statCourses', d.totalCourses);
        animateCount('statSessions', d.totalSessions);
        animateCount('statAttendances', d.totalAttendances);

        document.getElementById('statSubjectsSub').textContent = `${d.totalSubjects} môn học · ${d.totalCourses} lớp HP`;
        const activeText = d.activeSessions > 0
            ? `🟢 ${d.activeSessions} phiên đang hoạt động`
            : 'Không có phiên nào đang diễn ra';
        document.getElementById('statActiveSessions').textContent = activeText;

        // Semester badge
        if (d.currentSemester) {
            const badge = document.getElementById('semesterBadge');
            badge.style.display = 'inline-flex';
            document.getElementById('semesterLabel').textContent =
                `${d.currentSemester.nameFull} — ${d.currentSemester.schoolYear}`;
            if (d.currentSemester.currentWeek > 0) {
                document.getElementById('semesterWeek').textContent =
                    `Tuần ${d.currentSemester.currentWeek}/${d.currentSemester.totalWeeks}`;
            }
        }

        // Bar chart
        renderBarChart(d.attendanceLast7Days || []);

        // Today's schedule
        renderTodaySchedule(d.todaySchedules || []);

        // Quick stats
        renderQuickStats(d);

        // Enrollment breakdown
        renderEnrollment(d.enrollmentActive, d.enrollmentCancelled, d.enrollmentPending);

    } catch (e) {
        console.error('Dashboard stats error:', e);
    }
}

// ── Count-up Animation ───────────────────────────────────────
function animateCount(elId, target) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (target === 0) { el.textContent = '0'; return; }
    const duration = 1200;
    const start = performance.now();
    function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
        el.textContent = Math.floor(eased * target).toLocaleString('vi-VN');
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString('vi-VN');
    }
    requestAnimationFrame(step);
}

// ── Bar Chart ────────────────────────────────────────────────
function renderBarChart(data) {
    const container = document.getElementById('barChart');
    if (!data.length) {
        container.innerHTML = '<div style="text-align:center;width:100%;color:var(--text-muted);padding:60px 0;">Chưa có dữ liệu điểm danh</div>';
        return;
    }
    const maxVal = Math.max(...data.map(d => d.count), 1);
    container.innerHTML = data.map(d => {
        const pct = (d.count / maxVal) * 100;
        return `<div class="bar-col">
            <div class="bar-value">${d.count}</div>
            <div class="bar-fill" style="height:0%" data-height="${pct}%"></div>
            <div class="bar-label">${d.dayLabel}</div>
            <div class="bar-date">${d.date}</div>
        </div>`;
    }).join('');
    // Animate bars
    requestAnimationFrame(() => {
        container.querySelectorAll('.bar-fill').forEach(bar => {
            bar.style.height = bar.dataset.height;
        });
    });
}

// ── Today's Schedule ─────────────────────────────────────────
function renderTodaySchedule(schedules) {
    const container = document.getElementById('todayScheduleList');
    const badge = document.getElementById('todayScheduleCount');

    if (!schedules.length) {
        container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px 0;">
            <ion-icon name="sunny-outline" style="font-size:36px;color:#cbd5e1;display:block;margin:0 auto 10px;"></ion-icon>
            Hôm nay không có lịch học nào
        </div>`;
        if (badge) badge.style.display = 'none';
        return;
    }

    if (badge) {
        badge.style.display = 'inline-block';
        badge.textContent = `${schedules.length} môn`;
    }

    container.innerHTML = schedules.map(s => `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:10px 8px;border-bottom:1px solid var(--border-color);transition:background 0.15s;" onmouseenter="this.style.background='var(--primary-light)'" onmouseleave="this.style.background='transparent'">
            <div style="min-width:50px;text-align:center;padding:6px 0;">
                <div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;">Tiết</div>
                <div style="font-size:16px;font-weight:800;color:var(--text-dark);">${s.startLesson}-${s.endLesson}</div>
                <div style="font-size:10px;color:var(--text-muted);">${s.startTime || ''} - ${s.endTime || ''}</div>
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:13px;color:var(--text-dark);margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.subjectName}</div>
                <div style="font-size:11px;color:var(--text-muted);display:flex;gap:12px;flex-wrap:wrap;margin-top:3px;">
                    <span><ion-icon name="code-outline" style="font-size:12px;vertical-align:middle;"></ion-icon> ${s.subjectCode}</span>
                    <span><ion-icon name="person-outline" style="font-size:12px;vertical-align:middle;"></ion-icon> ${s.teacherName}</span>
                </div>
                <div style="font-size:11px;color:var(--text-muted);display:flex;gap:12px;margin-top:3px;">
                    <span><ion-icon name="business-outline" style="font-size:12px;vertical-align:middle;"></ion-icon> ${s.room}</span>
                    <span><ion-icon name="school-outline" style="font-size:12px;vertical-align:middle;"></ion-icon> ${s.className}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ── Quick Stats ──────────────────────────────────────────────
function renderQuickStats(d) {
    const container = document.getElementById('quickStats');
    if (!container) return;

    const totalEnroll = (d.enrollmentActive || 0) + (d.enrollmentCancelled || 0) + (d.enrollmentPending || 0);

    const rows = [
        { dot: '#2563eb', label: 'Phiên đang hoạt động', value: d.activeSessions || 0, unit: 'phiên' },
        { dot: '#059669', label: 'Phiên điểm danh hôm nay', value: d.todaySessionCount || 0, unit: 'phiên' },
        { dot: '#d97706', label: 'Lượt điểm danh hôm nay', value: d.todayAttendanceCount || 0, unit: 'lượt' },
        { dot: '#8b5cf6', label: 'Tổng đăng ký học phần', value: totalEnroll, unit: 'đăng ký' },
    ];

    container.innerHTML = rows.map((r, i) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:13px 16px;${i < rows.length - 1 ? 'border-bottom:1px solid var(--border-color);' : ''}">
            <div style="display:flex;align-items:center;gap:10px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${r.dot};flex-shrink:0;"></span>
                <span style="font-size:13px;color:var(--text-dark);font-weight:500;">${r.label}</span>
            </div>
            <div style="text-align:right;">
                <span style="font-size:18px;font-weight:700;color:var(--text-dark);">${r.value.toLocaleString('vi-VN')}</span>
                <span style="font-size:11px;color:var(--text-muted);margin-left:4px;">${r.unit}</span>
            </div>
        </div>
    `).join('');
}

// ── Enrollment Breakdown ─────────────────────────────────────
function renderEnrollment(active, cancelled, pending) {
    const container = document.getElementById('enrollStats');
    const total = active + cancelled + pending;
    if (total === 0) {
        container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px 0;"><ion-icon name="people-outline" style="font-size:32px;color:#cbd5e1;display:block;margin:0 auto 8px;"></ion-icon>Chưa có dữ liệu đăng ký</div>';
        return;
    }
    const pctA = ((active / total) * 100).toFixed(1);
    const pctC = ((cancelled / total) * 100).toFixed(1);
    const pctP = ((pending / total) * 100).toFixed(1);

    container.innerHTML = `
        <div class="enroll-bar-wrap">
            <div class="enroll-bar-track">
                <div class="enroll-bar-seg active" style="width:0%" data-width="${pctA}%"></div>
                <div class="enroll-bar-seg cancelled" style="width:0%" data-width="${pctC}%"></div>
                <div class="enroll-bar-seg pending" style="width:0%" data-width="${pctP}%"></div>
            </div>
        </div>
        <div class="enroll-legend">
            <div class="enroll-leg-item">
                <div class="enroll-leg-left"><div class="enroll-leg-dot active"></div><span class="enroll-leg-label">Đang học</span></div>
                <div><span class="enroll-leg-val">${active.toLocaleString('vi-VN')}</span><span class="enroll-leg-pct">(${pctA}%)</span></div>
            </div>
            <div class="enroll-leg-item">
                <div class="enroll-leg-left"><div class="enroll-leg-dot cancelled"></div><span class="enroll-leg-label">Đã hủy</span></div>
                <div><span class="enroll-leg-val">${cancelled.toLocaleString('vi-VN')}</span><span class="enroll-leg-pct">(${pctC}%)</span></div>
            </div>
            <div class="enroll-leg-item">
                <div class="enroll-leg-left"><div class="enroll-leg-dot pending"></div><span class="enroll-leg-label">Chờ duyệt</span></div>
                <div><span class="enroll-leg-val">${pending.toLocaleString('vi-VN')}</span><span class="enroll-leg-pct">(${pctP}%)</span></div>
            </div>
        </div>
        <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--text-muted);">
            Tổng: <strong style="color:var(--text-dark);">${total.toLocaleString('vi-VN')}</strong> đăng ký
        </div>`;

    // Animate enrollment bars
    requestAnimationFrame(() => {
        container.querySelectorAll('.enroll-bar-seg').forEach(seg => {
            seg.style.width = seg.dataset.width;
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// EXISTING FUNCTIONALITY (Users + Subjects tables, Modals)
// ═══════════════════════════════════════════════════════════════

async function loadDashboard() {
    // ── Load Users ──
    try {
        const res = await authFetch(`${API_BASE_URL}/admin/users`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const userData = await res.json();
        _allUsers = userData.filter(u => u.role !== 'ADMIN');
        document.getElementById('countStudent').textContent = _allUsers.filter(u => u.role === 'STUDENT').length;
        document.getElementById('countTeacher').textContent = _allUsers.filter(u => u.role === 'TEACHER').length;
        renderUserTable(_currentTab);
    } catch (e) {
        document.getElementById('userTable').innerHTML =
            `<tr class="error-row"><td colspan="6">Lỗi tải dữ liệu: ${e.message}</td></tr>`;
    }

    // ── Load Subjects ──
    try {
        const res2 = await authFetch(`${API_BASE_URL}/admin/subjects`);
        if (!res2.ok) throw new Error();
        const subjects = await res2.json();
        const tbody2 = document.getElementById('subjectTable');
        if (!subjects.length) {
            tbody2.innerHTML = '<tr class="empty-row"><td colspan="4">Chưa có môn học nào</td></tr>';
        } else {
            tbody2.innerHTML = subjects.map(s =>
                `<tr>
                    <td>${s.id}</td>
                    <td><span style="font-family:monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px;color:#334155;font-size:13px;">${s.code}</span></td>
                    <td style="font-weight:500;color:#1e293b;">${s.name}</td>
                    <td>${s.credits || 3}</td>
                </tr>`
            ).join('');
        }
    } catch (e) {
        document.getElementById('subjectTable').innerHTML = `<tr class="error-row"><td colspan="4">Lỗi tải môn học.</td></tr>`;
    }
}

// ── Tab switch ──
function switchTab(role) {
    _currentTab = role;
    document.getElementById('tabStudent').classList.toggle('active', role === 'STUDENT');
    document.getElementById('tabTeacher').classList.toggle('active', role === 'TEACHER');
    renderUserTable(role);
}

function renderUserTable(role) {
    const tbody = document.getElementById('userTable');
    const thMaSV = document.getElementById('thMaSV');
    const filtered = _allUsers.filter(u => u.role === role);
    thMaSV.style.display = role === 'TEACHER' ? 'none' : '';

    if (!filtered.length) {
        const colspan = role === 'TEACHER' ? 5 : 6;
        tbody.innerHTML = `<tr class="empty-row"><td colspan="${colspan}">Chưa có ${role === 'STUDENT' ? 'sinh viên' : 'giảng viên'} nào</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(u => {
        const date = u.createdAt ? u.createdAt.split('T')[0] : 'N/A';
        const maSVCell = role === 'TEACHER' ? '' : `<td>${u.username || '<span style="color:rgba(0,0,0,.2)">—</span>'}</td>`;
        return `<tr>
            <td>${u.id}</td><td>${u.email}</td>
            <td>${u.fullName || '<span style="color:rgba(0,0,0,.2)">—</span>'}</td>
            ${maSVCell}<td>${date}</td>
            <td style="text-align:right;">
                <button style="background:rgba(37,99,235,.12);border:1px solid rgba(37,99,235,.3);color:#3b82f6;padding:4px 12px;font-size:12px;border-radius:6px;cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:5px;" onclick="openEditUser(${u.id})">
                    <ion-icon name="pencil-outline" style="font-size:13px;"></ion-icon> Sửa
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ── Edit User Modal ──
function openEditUser(id) {
    const user = _allUsers.find(u => u.id === id);
    if (!user) return;
    _editingUserId = id;
    _editingUserEmail = user.email;
    const isStudent = user.role === 'STUDENT';
    document.getElementById('euTitle').textContent = `Sửa: ${user.fullName || user.email}`;
    document.getElementById('euFullName').value = user.fullName || '';
    document.getElementById('euEmail').value = user.email || '';
    document.getElementById('euPassword').value = '';
    document.getElementById('euRole').value = isStudent ? 'Sinh Viên' : 'Giảng Viên';
    document.getElementById('euUsername').value = user.username || '';
    document.getElementById('euDepartment').value = '';
    document.getElementById('euClassName').value = '';
    document.getElementById('euStudentIdRow').style.display = isStudent ? 'block' : 'none';
    document.getElementById('euExtraRow').style.display = isStudent ? 'grid' : 'none';
    document.getElementById('editUserModal').classList.add('open');
}

function closeEditUser() {
    _editingUserId = null;
    _editingUserEmail = '';
    document.getElementById('editUserModal').classList.remove('open');
}

async function saveEditUser() {
    if (!_editingUserId) return;
    const user = _allUsers.find(u => u.id === _editingUserId);
    const email = document.getElementById('euEmail').value.trim();
    const password = document.getElementById('euPassword').value;
    const fullName = document.getElementById('euFullName').value.trim();
    const username = document.getElementById('euUsername').value.trim();
    const dept = document.getElementById('euDepartment').value.trim();
    const cls = document.getElementById('euClassName').value.trim();
    if (!email) { showToast('Email không được để trống.', 'error'); return; }

    const btn = document.getElementById('euBtnSave');
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Đang lưu...';
    try {
        const payload = { email };
        if (password) payload.password = password;
        if (fullName) payload.fullName = fullName;
        if (dept) payload.department = dept;
        if (cls) payload.className = cls;
        if (user?.role === 'STUDENT' && username) payload.username = username;

        const res = await authFetch(`${API_BASE_URL}/admin/users/${_editingUserId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (res.ok) { showToast('Cập nhật thành công!', 'success'); closeEditUser(); loadDashboard(); }
        else { const d = await res.json().catch(() => ({})); showToast(d.error || 'Lỗi cập nhật.', 'error'); }
    } catch { showToast('Lỗi kết nối mạng.', 'error'); }
    finally { btn.disabled = false; btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Lưu'; }
}

function confirmDeleteFromModal() {
    if (!_editingUserId) return;
    if (_editingUserEmail === 'admin@qrcode.com') { showToast('Không thể xóa quản trị viên mặc định.', 'error'); return; }
    if (confirm(`Xóa tài khoản "${_editingUserEmail}"?\nHành động này không thể hoàn tác.`)) {
        deleteUserById(_editingUserId, _editingUserEmail);
    }
}

async function deleteUserById(id, email) {
    try {
        const res = await authFetch(`${API_BASE_URL}/admin/users/${id}`, { method: 'DELETE' });
        if (res.ok) { showToast(`Đã xóa ${email}`, 'success'); closeEditUser(); loadDashboard(); }
        else { const d = await res.json().catch(() => ({})); showToast(d.error || 'Lỗi xóa.', 'error'); }
    } catch { showToast('Lỗi mạng.', 'error'); }
}

document.getElementById('editUserModal')?.addEventListener('click', function (e) { if (e.target === this) closeEditUser(); });

// ── Create Account Modal ──
function openCreateAccountModal() {
    ['caFullName', 'caEmail', 'caPassword', 'caUsername', 'caClassName'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    document.getElementById('caRole').value = 'STUDENT';
    document.getElementById('caStudentFields').style.display = 'grid';
    document.getElementById('createAccountModal').classList.add('open');
}
function closeCreateAccountModal() { document.getElementById('createAccountModal').classList.remove('open'); }
function onCaRoleChange() {
    const isStudent = document.getElementById('caRole').value === 'STUDENT';
    document.getElementById('caStudentFields').style.display = isStudent ? 'grid' : 'none';
    if (!isStudent) { document.getElementById('caUsername').value = ''; document.getElementById('caClassName').value = ''; }
}

async function submitCreateAccount() {
    const role = document.getElementById('caRole').value;
    const fullName = document.getElementById('caFullName').value.trim();
    const email = document.getElementById('caEmail').value.trim();
    const password = document.getElementById('caPassword').value;
    const username = document.getElementById('caUsername').value.trim();
    const className = document.getElementById('caClassName').value.trim();

    if (!fullName) { showToast('Vui lòng nhập Họ & Tên.', 'error'); return; }
    if (!email) { showToast('Vui lòng nhập Email.', 'error'); return; }
    if (!password || password.length < 6) { showToast('Mật khẩu tối thiểu 6 ký tự.', 'error'); return; }
    if (role === 'STUDENT' && !username) { showToast('Vui lòng nhập Mã Sinh Viên.', 'error'); return; }

    const btn = document.getElementById('caBtnSave');
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Đang tạo...';
    try {
        const payload = { role, fullName, email, password };
        if (role === 'STUDENT') { payload.username = username; payload.className = className || null; }
        const res = await authFetch(`${API_BASE_URL}/admin/create-user`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
        });
        if (res.ok) { showToast('Tạo tài khoản thành công!', 'success'); closeCreateAccountModal(); loadDashboard(); loadDashboardStats(); }
        else { const d = await res.json().catch(() => ({})); showToast(d.error || 'Lỗi tạo tài khoản.', 'error'); }
    } catch { showToast('Lỗi kết nối mạng.', 'error'); }
    finally { btn.disabled = false; btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Tạo Tài Khoản'; }
}

document.getElementById('createAccountModal')?.addEventListener('click', function (e) { if (e.target === this) closeCreateAccountModal(); });

// ── Edit Subject (legacy compat) ──
let _editingSubjectId = null;
let _editingSubjectName = '';
function closeEditSubject() { _editingSubjectId = null; _editingSubjectName = ''; document.getElementById('editSubjectModal')?.classList.remove('open'); }

async function saveEditSubject() {
    if (!_editingSubjectId) return;
    const code = document.getElementById('esCode').value.trim();
    const name = document.getElementById('esName').value.trim();
    const credits = parseInt(document.getElementById('esCredits').value) || 3;
    if (!code || !name) { showToast('Vui lòng nhập đầy đủ.', 'error'); return; }
    const btn = document.getElementById('esBtnSave');
    btn.disabled = true;
    try {
        const res = await authFetch(`${API_BASE_URL}/admin/subjects/${_editingSubjectId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, name, credits })
        });
        if (res.ok) { showToast('Cập nhật môn học thành công!', 'success'); closeEditSubject(); loadDashboard(); }
        else { const d = await res.json().catch(() => ({})); showToast(d.error || 'Lỗi.', 'error'); }
    } catch { showToast('Lỗi mạng.', 'error'); }
    finally { btn.disabled = false; }
}

document.getElementById('editSubjectModal')?.addEventListener('click', function (e) { if (e.target === this) closeEditSubject(); });
