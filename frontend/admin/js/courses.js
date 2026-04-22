document.addEventListener('DOMContentLoaded', loadCourses);

const LESSON_TIMES = {
    1:'06:45', 2:'07:45', 3:'08:45', 4:'09:45', 5:'10:45',
    6:'12:30', 7:'13:30', 8:'14:30', 9:'15:30', 10:'16:30',
    11:'17:30', 12:'18:30', 13:'19:30'
};
const LESSON_END_TIMES = {
    1:'07:35', 2:'08:35', 3:'09:35', 4:'10:35', 5:'11:35',
    6:'13:20', 7:'14:20', 8:'15:20', 9:'16:20', 10:'17:20',
    11:'18:20', 12:'19:20', 13:'20:20'
};
const DOW_LABELS = ['','','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ Nhật'];

// ============================================================
//  CREDIT RULES — Quy tắc tín chỉ → tiết học (chuẩn ĐHVN)
//  2 tín: 2 tiết/tuần, 2 buổi/tuần (mỗi buổi 1 tiết)
//  3 tín: 3 tiết/tuần, 1 buổi/tuần (1 buổi liên tục 3 tiết)
//  4 tín: 6 tiết/tuần, 2 buổi/tuần (mỗi buổi 3 tiết)
// ============================================================
const CREDIT_RULES = {
    2: {
        lessonsPerSession: 1,
        sessionsPerWeek: 2,
        endOffset: 0, // endLesson = startLesson + 0 (1 tiết)
        hint: '📘 2 tín chỉ: <strong>2 tiết/tuần</strong>, <strong>2 buổi/tuần</strong> — Mỗi buổi <strong>1 tiết</strong> (thường xếp 2 thứ khác nhau).',
        hintColor: '#e3f2fd',
        hintBorder: '#1565c0'
    },
    3: {
        lessonsPerSession: 3,
        sessionsPerWeek: 1,
        endOffset: 2, // endLesson = startLesson + 2 (3 tiết liên tục)
        hint: '📗 3 tín chỉ: <strong>3 tiết/tuần</strong>, <strong>1 buổi/tuần</strong> — 1 buổi liên tục <strong>3 tiết</strong>.',
        hintColor: '#e8f5e9',
        hintBorder: '#2e7d32'
    },
    4: {
        lessonsPerSession: 3,
        sessionsPerWeek: 2,
        endOffset: 2, // endLesson = startLesson + 2 (3 tiết liên tục mỗi buổi)
        hint: '📙 4 tín chỉ: <strong>6 tiết/tuần</strong>, <strong>2 buổi/tuần</strong> — Mỗi buổi <strong>3 tiết</strong> liên tục.<br><small style="color:#6d4c00;">⚠️ Môn này cần 2 lịch học trong tuần — nhập lịch chính trước, sau đó chỉnh sửa thêm lịch phụ.</small>',
        hintColor: '#fff3e0',
        hintBorder: '#e65100'
    }
};

// ============================================================
//  SEMESTER CACHE — Dữ liệu học kỳ từ DB
// ============================================================
let semesterCache = [];

function populateLessonSelects() {
    const startSel = document.getElementById('startLesson');
    const endSel   = document.getElementById('endLesson');
    startSel.options.length = 0;
    endSel.options.length = 0;
    for (let i = 1; i <= 13; i++) {
        startSel.add(new Option(`Tiết ${i} — ${LESSON_TIMES[i]}`, i));
        endSel.add(new Option(`Tiết ${i} — ${LESSON_END_TIMES[i]}`, i));
    }
    startSel.value = '1';
    endSel.value   = '3';
    updateLessonPreview();
}

function updateLessonPreview() {
    const s = parseInt(document.getElementById('startLesson').value);
    const e = parseInt(document.getElementById('endLesson').value);
    const box = document.getElementById('lessonTimePreview');
    if (!box) return;
    if (s && e && s <= e) {
        box.style.background   = '#e8f5e9';
        box.style.borderColor  = '#66bb6a';
        box.style.color        = '#2e7d32';
        box.innerHTML = `⏰ <strong>Tiết ${s} → Tiết ${e}:</strong>&nbsp; ${LESSON_TIMES[s]} – ${LESSON_END_TIMES[e]}&nbsp;&nbsp;(${e - s + 1} tiết)`;
    } else {
        box.style.background  = '#ffebee';
        box.style.borderColor = '#ef9a9a';
        box.style.color       = '#c62828';
        box.innerHTML = `⚠️ Tiết bắt đầu không được lớn hơn tiết kết thúc!`;
    }
}

// Gắn event vào các select và input
document.addEventListener('DOMContentLoaded', () => {
    const s = document.getElementById('startLesson');
    const e = document.getElementById('endLesson');
    if (s) s.addEventListener('change', updateLessonPreview);
    if (e) e.addEventListener('change', updateLessonPreview);

    const creditsInput = document.getElementById('credits');
    if (creditsInput) creditsInput.addEventListener('change', onCreditsChange);
    if (creditsInput) creditsInput.addEventListener('input', onCreditsChange);
});

// ============================================================
//  CREDIT CHANGE HANDLER — Gợi ý tiết học theo tín chỉ
// ============================================================
function onCreditsChange() {
    const credits = parseInt(document.getElementById('credits').value);
    const hintBox = document.getElementById('creditHint');
    const rule = CREDIT_RULES[credits];

    if (!hintBox) return;

    if (rule) {
        hintBox.style.display = 'block';
        hintBox.style.background = rule.hintColor;
        hintBox.style.borderColor = rule.hintBorder;
        hintBox.innerHTML = rule.hint;

        // Auto-fill endLesson dựa trên startLesson hiện tại
        const startLesson = parseInt(document.getElementById('startLesson').value) || 1;
        const newEnd = Math.min(startLesson + rule.endOffset, 13);
        document.getElementById('endLesson').value = newEnd;
        updateLessonPreview();
    } else {
        hintBox.style.display = 'none';
    }
}

// ============================================================
//  SEMESTER CHANGE HANDLER — Auto-fill ngày từ DB
// ============================================================
function onSemesterSelectChange() {
    const semSel = document.getElementById('semester');
    const selectedVal = semSel.value;

    // Tìm semester trong cache theo label
    const sem = semesterCache.find(s => s.label === selectedVal);
    if (!sem) return;

    // Auto-fill ngày bắt đầu và kết thúc từ DB
    const startDateEl = document.getElementById('startDate');
    const endDateEl   = document.getElementById('endDate');

    if (sem.startDate) startDateEl.value = sem.startDate;
    if (sem.endDate)   endDateEl.value   = sem.endDate;

    // Hiện info panel
    updateSemesterInfo(sem);
}

function updateSemesterInfo(sem) {
    const infoBox = document.getElementById('semesterInfoBox');
    if (!infoBox) return;
    if (!sem) { infoBox.style.display = 'none'; return; }

    const start = sem.startDate ? new Date(sem.startDate + 'T00:00:00').toLocaleDateString('vi-VN') : 'N/A';
    const end   = sem.endDate   ? new Date(sem.endDate   + 'T00:00:00').toLocaleDateString('vi-VN') : 'N/A';
    const active = sem.isActive ? '<span style="background:#4caf50;color:#fff;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:700;">● Đang học</span>' : '';

    infoBox.style.display = 'block';
    infoBox.innerHTML = `
        📅 <strong>${sem.labelFull || sem.label}</strong> ${active}<br>
        <small>Thời gian: ${start} → ${end} &nbsp;|&nbsp; ${sem.totalWeeks || '?'} tuần học</small>
    `;
}

// ============================================================
//  LOAD SEMESTERS FROM DB
// ============================================================
async function loadSemestersIntoSelect() {
    const semSel = document.getElementById('semester');
    if (!semSel) return;

    try {
        const res = await authFetch(`${API_BASE_URL}/admin/semesters`);
        if (!res.ok) throw new Error('Không tải được học kỳ');
        semesterCache = await res.json();

        semSel.innerHTML = '<option value="">-- Chọn học kỳ --</option>';
        semesterCache.forEach(s => {
            const option = document.createElement('option');
            option.value = s.label; // Lưu format "HK1 — 2025-2026"
            option.textContent = `${s.labelFull} (${s.startDate ? new Date(s.startDate+'T00:00:00').toLocaleDateString('vi-VN') : '?'} → ${s.endDate ? new Date(s.endDate+'T00:00:00').toLocaleDateString('vi-VN') : '?'})`;
            if (s.isActive) option.style.fontWeight = '700';
            semSel.appendChild(option);
        });

        // Tự chọn học kỳ đang hoạt động
        const active = semesterCache.find(s => s.isActive);
        if (active) {
            semSel.value = active.label;
            onSemesterSelectChange();
        }
    } catch (err) {
        console.warn('[Courses] Không tải được semesters:', err);
        // Fallback hardcode nếu API lỗi
        semSel.innerHTML = `
            <option value="">-- Chọn học kỳ --</option>
            <option value="HK1 — 2024-2025">Học kỳ 1 — 2024-2025</option>
            <option value="HK2 — 2024-2025">Học kỳ 2 — 2024-2025</option>
            <option value="HK3 — 2024-2025">Học kỳ hè — 2024-2025</option>
            <option value="HK1 — 2025-2026" selected>Học kỳ 1 — 2025-2026</option>
            <option value="HK2 — 2025-2026">Học kỳ 2 — 2025-2026</option>
            <option value="HK3 — 2025-2026">Học kỳ hè — 2025-2026</option>
        `;
    }

    // Gắn event listener
    semSel.addEventListener('change', onSemesterSelectChange);
}

let allAdminCourses = [];

async function loadCourses() {
    const tbody = document.getElementById('courseTable');
    try {
        const res = await authFetch(`${API_BASE_URL}/admin/courses`);
        const data = await res.json();
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Chưa có khóa học nào được tạo.</td></tr>';
            return;
        }

        allAdminCourses = data;

        tbody.innerHTML = data.map(c => {
            const scheduleInfo = c.dayOfWeek
                ? `${DOW_LABELS[c.dayOfWeek]} | Tiết ${c.startLesson}→${c.endLesson} | Phòng: ${c.room || 'N/A'}`
                : 'Chưa xếp lịch';
            const timeRange = c.startLesson
                ? `${LESSON_TIMES[c.startLesson]} – ${LESSON_END_TIMES[c.endLesson]}`
                : '';
            const dateRange = c.startDate
                ? `${new Date(c.startDate+'T00:00:00').toLocaleDateString('vi-VN')} → ${new Date(c.endDate+'T00:00:00').toLocaleDateString('vi-VN')}`
                : 'Chưa cập nhật';
            return `
            <tr>
                <td>#${c.id}</td>
                <td>
                    <span style="display:inline-block;background:#e3f2fd;color:#1565c0;padding:2px 7px;border-radius:3px;font-size:11px;font-weight:700;">${c.subjectCode}</span>
                    <div style="font-weight:600;margin-top:4px;">${c.subjectName}</div>
                    <small style="color:var(--text-muted);">${c.credits || 3} tín chỉ</small>
                </td>
                <td>
                    <div style="font-weight:600;">Nhóm: ${c.className}</div>
                    <div style="font-size:12px;color:var(--primary);margin-top:3px;">${scheduleInfo}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${timeRange}</div>
                </td>
                <td>${c.semester}</td>
                <td><small style="line-height:1.6;">${dateRange}</small></td>
                <td>
                    <div style="font-weight:600;">${c.teacherName}</div>
                    <small style="color:var(--text-muted);">${c.teacherEmail}</small>
                </td>
                <td>
                    <button class="btn" style="padding:4px 10px;font-size:12px;border-color:var(--primary);color:var(--primary);"
                        onclick="editCourse(${c.id})">
                        ✏️ Sửa
                    </button>
                </td>
            </tr>`;
        }).join('');
    } catch {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger);">Lỗi tải dữ liệu.</td></tr>';
    }
}

let editingCourseId = null;

async function openCreateModal() {
    editingCourseId = null;
    document.getElementById('modalTitle').textContent = 'Cài Đặt Môn Học Mới';
    document.getElementById('submitBtn').textContent = 'Tạo Môn Học & Phân Công';
    document.getElementById('courseForm').reset();
    populateLessonSelects();

    // Ẩn credit hint và semester info khi reset
    const hintBox = document.getElementById('creditHint');
    if (hintBox) hintBox.style.display = 'none';
    const infoBox = document.getElementById('semesterInfoBox');
    if (infoBox) infoBox.style.display = 'none';

    document.getElementById('courseModal').style.display = 'flex';

    // Load dropdowns concurrently
    try {
        const [tcrRes] = await Promise.all([
            authFetch(`${API_BASE_URL}/admin/teachers`)
        ]);

        const teachers = await tcrRes.json();

        const tcrSelect = document.getElementById('teacherId');
        tcrSelect.innerHTML = teachers.map(t => `<option value="${t.id}">${t.fullName} (${t.email})</option>`).join('');

    } catch {
        showToast('Lỗi khi tải dữ liệu form.', 'error');
    }

    // Load semesters từ DB
    await loadSemestersIntoSelect();

    // Gợi ý tiết học mặc định theo tín chỉ = 3
    onCreditsChange();
}

function closeCreateModal() {
    document.getElementById('courseModal').style.display = 'none';
    editingCourseId = null;
}

async function editCourse(id) {
    const course = allAdminCourses.find(c => c.id === id);
    if (!course) return;

    await openCreateModal();

    document.getElementById('modalTitle').textContent = 'Cập Nhật Môn Học';
    document.getElementById('submitBtn').textContent = 'Lưu Thay Đổi';
    editingCourseId = id;

    document.getElementById('subjectCode').value = course.subjectCode || '';
    document.getElementById('subjectName').value = course.subjectName || '';
    document.getElementById('credits').value = course.credits || 3;
    document.getElementById('className').value = course.className || '';
    document.getElementById('room').value = course.room || '';
    document.getElementById('dayOfWeek').value = course.dayOfWeek || 2;
    document.getElementById('startLesson').value = course.startLesson || 1;
    document.getElementById('endLesson').value = course.endLesson || 3;
    document.getElementById('startDate').value = course.startDate || '';
    document.getElementById('endDate').value = course.endDate || '';
    document.getElementById('teacherId').value = course.teacherId || '';

    // Set semester value (so sánh label từ cache với giá trị đang lưu)
    const semSel = document.getElementById('semester');
    // Thử khớp theo label chính xác trước
    const matchedOpt = Array.from(semSel.options).find(o => o.value === course.semester);
    if (matchedOpt) {
        semSel.value = course.semester;
    }

    // Cập nhật credit hint
    onCreditsChange();
    updateLessonPreview();

    // Hiện thông tin học kỳ tương ứng
    const sem = semesterCache.find(s => s.label === course.semester);
    if (sem) updateSemesterInfo(sem);
}

document.getElementById('courseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        subjectCode: document.getElementById('subjectCode').value.trim(),
        subjectName: document.getElementById('subjectName').value.trim(),
        credits: parseInt(document.getElementById('credits').value),
        className: document.getElementById('className').value.trim(),
        room: document.getElementById('room').value.trim(),
        dayOfWeek: parseInt(document.getElementById('dayOfWeek').value),
        startLesson: parseInt(document.getElementById('startLesson').value),
        endLesson: parseInt(document.getElementById('endLesson').value),
        teacherId: parseInt(document.getElementById('teacherId').value),
        semester: document.getElementById('semester').value.trim(),
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value
    };

    const errs = [];
    if (!payload.subjectCode)   errs.push('Mã môn học');
    if (!payload.subjectName)   errs.push('Tên môn học');
    if (!payload.className)     errs.push('Tên nhóm/lớp');
    if (!payload.room)          errs.push('Phòng học');
    if (!payload.teacherId)     errs.push('Giảng viên');
    if (!payload.semester)      errs.push('Học kỳ');
    if (!payload.startDate)     errs.push('Ngày bắt đầu');
    if (!payload.endDate)       errs.push('Ngày kết thúc');
    if (errs.length) {
        showToast(`Vui lòng điền đầy đủ: ${errs.join(', ')}`, 'error');
        return;
    }
    if (payload.startLesson > payload.endLesson) {
        showToast('Tiết bắt đầu phải ≤ tiết kết thúc!', 'error');
        return;
    }
    if (new Date(payload.startDate) >= new Date(payload.endDate)) {
        showToast('Ngày bắt đầu phải trước ngày kết thúc!', 'error');
        return;
    }

    // Validate ngày với phạm vi học kỳ đã chọn từ DB
    const selectedSem = semesterCache.find(s => s.label === payload.semester);
    if (selectedSem && selectedSem.startDate && selectedSem.endDate) {
        const semStart = new Date(selectedSem.startDate + 'T00:00:00');
        const semEnd   = new Date(selectedSem.endDate   + 'T00:00:00');
        const cStart   = new Date(payload.startDate);
        const cEnd     = new Date(payload.endDate);

        if (cStart < semStart || cEnd > semEnd) {
            showToast(
                `Ngày học phải nằm trong học kỳ: ${semStart.toLocaleDateString('vi-VN')} → ${semEnd.toLocaleDateString('vi-VN')}`,
                'error'
            );
            return;
        }
    }

    try {
        const url = editingCourseId
            ? `${API_BASE_URL}/admin/courses/${editingCourseId}`
            : `${API_BASE_URL}/admin/courses`;
        const methodType = editingCourseId ? 'PUT' : 'POST';

        const res = await authFetch(url, {
            method: methodType,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(editingCourseId ? 'Cập nhật thành công!' : 'Tạo môn học và Phân công thành công!');
            closeCreateModal();
            loadCourses();
        } else {
            const data = await res.json();
            showToast(data.error || 'Lỗi thao tác trên máy chủ.', 'error');
        }
    } catch {
        showToast('Lỗi mạng lưới!', 'error');
    }
});
