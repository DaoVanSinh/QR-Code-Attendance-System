let allCourses = [];
let allStudents = [];
let manuallyAdded = new Set(); // student IDs toggled to present by teacher

document.addEventListener('DOMContentLoaded', loadCourses);

async function loadCourses() {
    try {
        const res = await authFetch(`${API_BASE_URL}/teacher/courses`);
        if (!res.ok) throw new Error('Lỗi tải danh sách môn học');
        allCourses = await res.json();
        populateSemesters();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function populateSemesters() {
    const semesters = [...new Set(allCourses.map(c => c.semester).filter(Boolean))].sort();
    const sel = document.getElementById('semesterFilter');
    sel.innerHTML = '<option value="">— Chọn học kỳ —</option>';
    semesters.forEach(s => {
        sel.innerHTML += `<option value="${s}">${s}</option>`;
    });
}

function onSemesterChange() {
    const sem = document.getElementById('semesterFilter').value;
    const courseSel = document.getElementById('courseFilter');
    const sessionSel = document.getElementById('sessionFilter');

    courseSel.innerHTML = '<option value="">— Chọn môn học —</option>';
    sessionSel.innerHTML = '<option value="">— Chọn phiên —</option>';
    sessionSel.disabled = true;
    hideStudentList();

    if (!sem) {
        courseSel.disabled = true;
        return;
    }

    const filtered = allCourses.filter(c => c.semester === sem);
    filtered.forEach(c => {
        courseSel.innerHTML += `<option value="${c.id}">${c.subjectCode} — ${c.subjectName} (${c.className || 'N/A'})</option>`;
    });
    courseSel.disabled = false;
}

async function onCourseChange() {
    const courseId = document.getElementById('courseFilter').value;
    const sessionSel = document.getElementById('sessionFilter');
    sessionSel.innerHTML = '<option value="">— Chọn phiên —</option>';
    hideStudentList();

    if (!courseId) {
        sessionSel.disabled = true;
        return;
    }

    try {
        const res = await authFetch(`${API_BASE_URL}/teacher/courses/${courseId}/sessions`);
        if (!res.ok) throw new Error('Lỗi tải danh sách phiên');
        const sessions = await res.json();

        if (sessions.length === 0) {
            sessionSel.innerHTML = '<option value="">Chưa có phiên điểm danh nào</option>';
            sessionSel.disabled = true;
            return;
        }

        sessions.forEach(s => {
            const startStr = new Date(s.startTime + (s.startTime.includes('Z') ? '' : 'Z')).toLocaleString('vi-VN');
            const badge = s.expired ? '🔴 Hết hạn' : '🟢 Đang mở';
            sessionSel.innerHTML += `<option value="${s.id}">${badge} | ${startStr} (${s.attendanceCount} SV đã quét)</option>`;
        });
        sessionSel.disabled = false;
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function onSessionChange() {
    const courseId = document.getElementById('courseFilter').value;
    const sessionId = document.getElementById('sessionFilter').value;
    hideStudentList();

    if (!courseId || !sessionId) return;

    try {
        const res = await authFetch(`${API_BASE_URL}/teacher/courses/${courseId}/sessions/${sessionId}/students`);
        if (!res.ok) throw new Error('Lỗi tải danh sách sinh viên');
        allStudents = await res.json();
        manuallyAdded.clear();
        renderStudentList();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function renderStudentList() {
    const container = document.getElementById('studentList');
    const card = document.getElementById('studentListCard');
    const summary = document.getElementById('summaryBar');
    const emptyState = document.getElementById('emptyState');

    if (allStudents.length === 0) {
        card.style.display = 'none';
        summary.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
            <ion-icon name="people-outline" style="font-size:48px;color:#ccc;margin-bottom:12px;display:block;"></ion-icon>
            <p style="font-size:15px;">Không có sinh viên nào đăng ký học phần này.</p>
        `;
        return;
    }

    emptyState.style.display = 'none';
    card.style.display = 'block';
    summary.style.display = 'flex';

    // Sort: absent first, then present
    const sorted = [...allStudents].sort((a, b) => {
        const aPresent = a.present || manuallyAdded.has(a.studentId);
        const bPresent = b.present || manuallyAdded.has(b.studentId);
        return aPresent - bPresent; // false (0) before true (1)
    });

    container.innerHTML = sorted.map((student, index) => {
        const isPresent = student.present || manuallyAdded.has(student.studentId);
        const isQrChecked = student.present; // original QR check-in
        const timeStr = student.checkInTime
            ? new Date(student.checkInTime + (student.checkInTime.toString().includes('Z') ? '' : 'Z')).toLocaleTimeString('vi-VN')
            : '';

        return `
        <div class="student-row">
            <div style="width:32px;text-align:center;font-weight:600;color:var(--text-muted);">${index + 1}</div>
            <div class="student-info">
                <div class="student-name">${student.studentName}</div>
                <div class="student-email">${student.studentEmail}</div>
            </div>
            <div style="min-width:100px;text-align:center;">
                ${isQrChecked
                    ? `<span class="status-badge status-present">✅ QR ${timeStr}</span>`
                    : isPresent
                        ? `<span class="status-badge status-present">✅ Thủ công</span>`
                        : `<span class="status-badge status-absent">❌ Vắng</span>`
                }
            </div>
            <div>
                ${isQrChecked
                    ? ''
                    : `<button class="toggle-btn ${isPresent ? 'active' : ''}" onclick="toggleStudent(${student.studentId})">
                        ${isPresent ? '↩ Bỏ chọn' : '✅ Có mặt'}
                       </button>`
                }
            </div>
        </div>
        `;
    }).join('');

    updateSummary();
}

function toggleStudent(studentId) {
    if (manuallyAdded.has(studentId)) {
        manuallyAdded.delete(studentId);
    } else {
        manuallyAdded.add(studentId);
    }
    renderStudentList();
}

function toggleAll() {
    const absentStudents = allStudents.filter(s => !s.present);
    const allToggled = absentStudents.every(s => manuallyAdded.has(s.studentId));

    if (allToggled) {
        // Untoggle all
        absentStudents.forEach(s => manuallyAdded.delete(s.studentId));
    } else {
        // Toggle all absent to present
        absentStudents.forEach(s => manuallyAdded.add(s.studentId));
    }
    renderStudentList();
}

function updateSummary() {
    const total = allStudents.length;
    const present = allStudents.filter(s => s.present || manuallyAdded.has(s.studentId)).length;
    const absent = total - present;

    document.getElementById('totalCount').textContent = total;
    document.getElementById('presentCount').textContent = present;
    document.getElementById('absentCount').textContent = absent;
    document.getElementById('btnSave').disabled = manuallyAdded.size === 0;
}

async function saveManualAttendance() {
    if (manuallyAdded.size === 0) {
        showToast('Chưa chọn sinh viên nào để điểm danh.', 'error');
        return;
    }

    const sessionId = document.getElementById('sessionFilter').value;
    if (!sessionId) return;

    const btnSave = document.getElementById('btnSave');
    btnSave.disabled = true;
    btnSave.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> Đang lưu...';

    try {
        const res = await authFetch(`${API_BASE_URL}/teacher/sessions/${sessionId}/manual-check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentIds: Array.from(manuallyAdded) })
        });

        if (res.ok) {
            showToast(`Điểm danh thủ công thành công cho ${manuallyAdded.size} sinh viên!`, 'success');
            // Reload student list to reflect changes
            await onSessionChange();
        } else {
            const data = await res.json();
            showToast(data.error || 'Lỗi khi lưu điểm danh.', 'error');
        }
    } catch (err) {
        showToast('Lỗi mạng khi lưu điểm danh.', 'error');
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = '<ion-icon name="save-outline"></ion-icon> Lưu Điểm Danh';
    }
}

function hideStudentList() {
    document.getElementById('studentListCard').style.display = 'none';
    document.getElementById('summaryBar').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('emptyState').innerHTML = `
        <ion-icon name="clipboard-outline" style="font-size:48px;color:#ccc;margin-bottom:12px;display:block;"></ion-icon>
        <p style="font-size:15px;">Chọn Học kỳ → Môn học → Phiên điểm danh để bắt đầu.</p>
    `;
    allStudents = [];
    manuallyAdded.clear();
}
