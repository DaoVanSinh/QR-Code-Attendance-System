// Danh sách sinh viên đăng ký theo môn học

let _allCourses = [];

document.addEventListener('DOMContentLoaded', async () => {
    await loadSemesters();
});

// ── Load danh sách học kỳ ─────────────────────────────────────────
async function loadSemesters() {
    try {
        const res = await authFetch(`${API_BASE_URL}/admin/semesters`);
        if (!res.ok) throw new Error();
        const semesters = await res.json();
        const sel = document.getElementById('semesterFilter');
        sel.innerHTML = '<option value="">-- Chọn học kỳ --</option>' +
            semesters.map(s => `<option value="${s.id}">${s.labelFull || s.label || s.name}</option>`).join('');
    } catch {
        showToast('Lỗi tải danh sách học kỳ.', 'error');
    }
}

// ── Khi chọn học kỳ → load danh sách lớp học phần ───────────────
async function onSemesterChange() {
    const semesterId = document.getElementById('semesterFilter').value;
    const courseFilter = document.getElementById('courseFilter');
    const infoBar = document.getElementById('courseInfoBar');

    // Reset
    courseFilter.innerHTML = '<option value="">-- Đang tải... --</option>';
    courseFilter.disabled = true;
    infoBar.classList.remove('show');
    resetStudentTable();

    if (!semesterId) {
        courseFilter.innerHTML = '<option value="">-- Chọn học kỳ trước --</option>';
        return;
    }

    try {
        const res = await authFetch(`${API_BASE_URL}/admin/courses`);
        if (!res.ok) throw new Error();
        const allCourses = await res.json();

        _allCourses = allCourses.filter(c => String(c.semesterId) === semesterId);

        if (!_allCourses.length) {
            courseFilter.innerHTML = '<option value="">Không có lớp nào trong học kỳ này</option>';
            return;
        }

        courseFilter.innerHTML = '<option value="">-- Chọn lớp học phần --</option>' +
            _allCourses.map(c =>
                `<option value="${c.id}">[${c.subjectCode}] ${c.subjectName} — ${c.className} (${c.teacherName})</option>`
            ).join('');
        courseFilter.disabled = false;
    } catch {
        showToast('Lỗi tải danh sách môn học.', 'error');
        courseFilter.innerHTML = '<option value="">Lỗi tải dữ liệu</option>';
    }
}

// ── Khi chọn lớp học phần → load danh sách sinh viên ─────────────
async function onCourseChange() {
    const courseId = document.getElementById('courseFilter').value;
    const infoBar  = document.getElementById('courseInfoBar');

    if (!courseId) {
        infoBar.classList.remove('show');
        resetStudentTable();
        return;
    }

    // Hiển thị thông tin môn
    const course = _allCourses.find(c => String(c.id) === courseId);
    if (course) {
        document.getElementById('infoSubject').textContent  = `${course.subjectCode} — ${course.subjectName}`;
        document.getElementById('infoTeacher').textContent  = course.teacherName;
        document.getElementById('infoSemester').textContent = course.semester;
        document.getElementById('infoSlots').textContent    = `${course.currentSlots || 0}/${course.maxSlots || '∞'}`;
        infoBar.classList.add('show');
    }

    // Tải danh sách sinh viên
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px;">Đang tải...</td></tr>';

    try {
        const res = await authFetch(`${API_BASE_URL}/admin/courses/${courseId}/students`);
        if (!res.ok) throw new Error();
        const students = await res.json();

        // Cập nhật chip count
        const chipCount = document.getElementById('chipCount');
        const chipCountVal = document.getElementById('chipCountVal');
        chipCount.style.display = 'inline-flex';
        chipCountVal.textContent = students.length;

        if (!students.length) {
            tbody.innerHTML = `<tr><td colspan="7">
                <div class="empty-state">
                    <ion-icon name="person-outline"></ion-icon>
                    <p>Chưa có sinh viên nào đăng ký môn học này</p>
                </div>
            </td></tr>`;
            return;
        }

        tbody.innerHTML = students.map((s, i) => {
            const date = s.enrolledAt ? s.enrolledAt.split('T')[0] : '—';
            const isActive = s.status === 'ACTIVE';
            const badge = isActive
                ? '<span class="badge-active"><ion-icon name="checkmark-circle-outline"></ion-icon> Đang học</span>'
                : '<span class="badge-active badge-inactive"><ion-icon name="close-circle-outline"></ion-icon> Đã hủy</span>';
            return `<tr>
                <td style="color:var(--text-muted);font-size:13px;">${i + 1}</td>
                <td><span style="font-family:monospace;background:rgba(79,70,229,0.08);padding:2px 8px;border-radius:6px;font-size:13px;color:var(--primary);">${s.username || '—'}</span></td>
                <td style="font-weight:600;">${s.fullName || '—'}</td>
                <td style="color:var(--text-muted);font-size:13px;">${s.email || '—'}</td>
                <td style="font-size:13px;">${s.className || '—'}</td>
                <td style="font-size:13px;color:var(--text-muted);">${date}</td>
                <td style="text-align:center;">${badge}</td>
            </tr>`;
        }).join('');

    } catch {
        showToast('Lỗi tải danh sách sinh viên.', 'error');
        resetStudentTable();
    }
}

function resetStudentTable() {
    document.getElementById('chipCount').style.display = 'none';
    document.getElementById('studentTableBody').innerHTML = `<tr><td colspan="7">
        <div class="empty-state">
            <ion-icon name="school-outline"></ion-icon>
            <p>Chọn học kỳ và môn học để xem danh sách sinh viên</p>
        </div>
    </td></tr>`;
}
