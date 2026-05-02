// ── Auth & Sidebar ─────────────────────────────────────────────────────────
const auth = checkAuth('TEACHER');
if (auth) {
    document.getElementById('sidebar-placeholder').innerHTML = buildSidebar('monitor.html');
    fetchAndCacheAvatar();
}

// ── State ──────────────────────────────────────────────────────────────────
let selectedCourseId = null;
let selectedSessionId = null;
let liveInterval = null;

// ── Init ───────────────────────────────────────────────────────────────────
loadCourses();

// ── Load môn học của giảng viên ────────────────────────────────────────────
async function loadCourses() {
    try {
        const res = await authFetch(`${API_BASE_URL}/teacher/courses`);
        if (!res.ok) throw new Error();
        const courses = await res.json();

        const sel = document.getElementById('filterCourse');
        sel.innerHTML = '<option value="">-- Chọn học phần --</option>';

        courses.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.subjectName} — ${c.subjectCode} (${c.semester || ''})`;
            sel.appendChild(opt);
        });
    } catch (e) {
        showToast('Lỗi tải danh sách học phần.', 'error');
    }
}

// ── Khi chọn môn học → load danh sách phiên ──────────────────────────────
async function onCourseChange() {
    const courseId = document.getElementById('filterCourse').value;
    selectedCourseId = courseId || null;
    selectedSessionId = null;

    // Reset session dropdown và table
    const sessionSel = document.getElementById('filterSession');
    sessionSel.innerHTML = '<option value="">-- Chọn phiên --</option>';
    resetTable('Vui lòng chọn phiên điểm danh.');
    resetStats();
    stopLive();

    document.getElementById('btnExport').disabled = true;

    if (!courseId) return;

    try {
        const res = await authFetch(`${API_BASE_URL}/teacher/courses/${courseId}/sessions`);
        if (!res.ok) throw new Error();
        const sessions = await res.json();

        if (!sessions.length) {
            sessionSel.innerHTML = '<option value="">-- Chưa có phiên nào --</option>';
            return;
        }

        sessions.forEach((s, idx) => {
            const opt = document.createElement('option');
            opt.value = s.id;
            const date = new Date(s.startTime + (s.startTime.endsWith('Z') ? '' : 'Z'));
            const dateStr = date.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
            const expired = s.expired ? ' [Đã kết thúc]' : ' [Đang mở]';
            opt.textContent = `Phiên ${idx + 1}: ${dateStr}${expired}`;
            // Auto-select phiên đầu tiên (phiên mới nhất)
            if (idx === 0) opt.setAttribute('data-auto', '1');
            sessionSel.appendChild(opt);
        });

        // Auto-chọn phiên đầu tiên
        sessionSel.selectedIndex = 1;
        onSessionChange();

    } catch (e) {
        showToast('Lỗi tải danh sách phiên học.', 'error');
    }
}

// ── Khi chọn phiên → load danh sách điểm danh ───────────────────────────
function onSessionChange() {
    const sessionId = document.getElementById('filterSession').value;
    selectedSessionId = sessionId || null;

    stopLive();
    document.getElementById('btnExport').disabled = !sessionId;

    if (!sessionId) {
        resetTable('Vui lòng chọn phiên điểm danh.');
        resetStats();
        return;
    }

    loadFullAttendance(sessionId);

    // Nếu phiên đang mở (option không chứa "Đã kết thúc") → live refresh 10s
    const sel = document.getElementById('filterSession');
    const text = sel.options[sel.selectedIndex]?.textContent || '';
    if (text.includes('Đang mở')) {
        document.getElementById('liveIndicator').style.display = 'inline-flex';
        liveInterval = setInterval(() => loadFullAttendance(selectedSessionId), 10000);
    } else {
        document.getElementById('liveIndicator').style.display = 'none';
    }
}

// ── Load toàn bộ SV (có mặt + vắng mặt) từ API ──────────────────────────
async function loadFullAttendance(sessionId) {
    if (!sessionId || !selectedCourseId) return;

    try {
        // Dùng API getEnrolledStudentsWithStatus: trả về cả present + absent
        const res = await authFetch(
            `${API_BASE_URL}/teacher/courses/${selectedCourseId}/sessions/${sessionId}/students`
        );
        if (!res.ok) throw new Error();
        const students = await res.json();

        renderTable(students);
        updateStats(students);

    } catch (e) {
        showToast('Lỗi tải danh sách điểm danh.', 'error');
    }
}

// ── Render bảng ───────────────────────────────────────────────────────────
function renderTable(students) {
    const tbody = document.getElementById('attendanceTable');

    if (!students.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">Chưa có sinh viên nào đăng ký học phần này.</td></tr>';
        return;
    }

    tbody.innerHTML = students.map((s, i) => {
        const statusBadge = s.present
            ? '<span class="badge-present">✅ Có mặt</span>'
            : '<span class="badge-absent">❌ Vắng mặt</span>';

        const checkInTime = s.checkInTime
            ? new Date(s.checkInTime + (s.checkInTime.endsWith('Z') ? '' : 'Z'))
                .toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' })
            : '—';

        return `
            <tr>
                <td>${i + 1}</td>
                <td style="font-family:monospace;font-size:13px;">${s.studentCode || s.studentEmail || '—'}</td>
                <td><strong>${s.studentName || '—'}</strong></td>
                <td>${statusBadge}</td>
                <td style="color:var(--text-muted);font-size:13px;">${checkInTime}</td>
            </tr>`;
    }).join('');
}

// ── Cập nhật số liệu thống kê ─────────────────────────────────────────────
function updateStats(students) {
    const presentCount = students.filter(s => s.present).length;
    const absentCount  = students.length - presentCount;
    document.getElementById('statTotal').textContent   = students.length;
    document.getElementById('statPresent').textContent = presentCount;
    document.getElementById('statAbsent').textContent  = absentCount;
}

// ── Export Excel ──────────────────────────────────────────────────────────
async function exportExcel() {
    if (!selectedSessionId) { showToast('Vui lòng chọn phiên điểm danh.', 'error'); return; }

    const btn = document.getElementById('btnExport');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Đang xuất...';

    try {
        const res = await authFetch(`${API_BASE_URL}/teacher/sessions/${selectedSessionId}/export`);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showToast(err.error || 'Lỗi xuất file.', 'error');
            return;
        }

        // Lấy tên file từ Content-Disposition header nếu có
        const cd = res.headers.get('Content-Disposition') || '';
        const match = cd.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : `diemdanh_session_${selectedSessionId}.xlsx`;

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showToast('✅ Xuất báo cáo thành công!', 'success');
    } catch (e) {
        showToast('Lỗi kết nối mạng.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
}

// ── Làm mới ───────────────────────────────────────────────────────────────
function reloadAttendance() {
    if (selectedSessionId) {
        loadFullAttendance(selectedSessionId);
        showToast('Đã làm mới dữ liệu.', 'success');
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function stopLive() {
    if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
    document.getElementById('liveIndicator').style.display = 'none';
}

function resetTable(msg) {
    document.getElementById('attendanceTable').innerHTML =
        `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">${msg}</td></tr>`;
}

function resetStats() {
    ['statTotal','statPresent','statAbsent'].forEach(id =>
        document.getElementById(id).textContent = '0');
}
