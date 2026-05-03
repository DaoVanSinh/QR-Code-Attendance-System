// ══════════════════════════════════════════════════════════════
//  CONSTANTS
// ══════════════════════════════════════════════════════════════
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

// Credit → schedule rules
const CREDIT_RULES = {
    2: { endOffset: 1, sessionsPerWeek: 1, lessonsPerSession: 2, needsSecondSession: false,
         label: '2 tín chỉ', color: '#e3f2fd', border: '#90caf9', text: '#0d47a1',
         desc: '1 buổi/tuần · mỗi buổi <strong>2 tiết liên tiếp</strong>' },
    3: { endOffset: 2, sessionsPerWeek: 1, lessonsPerSession: 3, needsSecondSession: false,
         label: '3 tín chỉ', color: '#e8f5e9', border: '#a5d6a7', text: '#1b5e20',
         desc: '1 buổi/tuần · mỗi buổi <strong>3 tiết liên tiếp</strong>' },
    4: { endOffset: 1, sessionsPerWeek: 2, lessonsPerSession: 2, needsSecondSession: true,
         label: '4 tín chỉ', color: '#fff3e0', border: '#ffcc80', text: '#e65100',
         desc: '2 buổi/tuần · mỗi buổi <strong>2 tiết liên tiếp</strong> — nhập cả 2 buổi bên dưới' }
};

// Tiết không được là tiết bắt đầu (cuối buổi sáng / cuối ngày)
const INVALID_START_LESSONS = new Set([5, 13]);

// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════
let allAdminCourses = [];
let semesterCache   = [];
let editingCourseId = null;
let currentStep     = 1;
const TOTAL_STEPS   = 3;

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    loadCourses();
    populateLessonSelects();
});

// ══════════════════════════════════════════════════════════════
//  LESSON SELECT HELPERS
// ══════════════════════════════════════════════════════════════
function populateLessonSelects() {
    _fillLessonSelect('startLesson', 'endLesson', 1, 3);
    _fillLessonSelect('startLesson2', 'endLesson2', 1, 3);
    updateLessonPreview();
    updateLessonPreview2();
}

function _fillLessonSelect(startId, endId, defaultStart, defaultEnd) {
    const startSel = document.getElementById(startId);
    const endSel   = document.getElementById(endId);
    if (!startSel || !endSel) return;
    startSel.innerHTML = '';
    endSel.innerHTML   = '';
    for (let i = 1; i <= 13; i++) {
        startSel.add(new Option(`Tiết ${i}  (${LESSON_TIMES[i]})`, i));
        endSel.add(new Option(`Tiết ${i}  (${LESSON_END_TIMES[i]})`, i));
    }
    startSel.value = String(defaultStart);
    endSel.value   = String(defaultEnd);
}

// ── Called when credits select changes ──────────────────────
function onCreditsChange() {
    const credits = parseInt(document.getElementById('credits')?.value);
    const rule    = CREDIT_RULES[credits];
    if (!rule) return;

    // Update info banner
    const banner = document.getElementById('creditInfoBanner');
    if (banner) {
        banner.style.display     = 'flex';
        banner.style.background  = rule.color;
        banner.style.borderColor = rule.border;
        banner.style.color       = rule.text;
        banner.innerHTML = `<ion-icon name="information-circle-outline" style="font-size:16px;flex-shrink:0;"></ion-icon>
            <span><strong>${rule.label}:</strong> ${rule.desc}</span>`;
    }

    // Auto-set endLesson based on startLesson + rule
    _applyEndOffset('startLesson', 'endLesson', rule.endOffset);
    updateLessonPreview();

    // Show / hide second session block and update its label
    const sec = document.getElementById('secondScheduleSection');
    if (sec) {
        sec.style.display = rule.needsSecondSession ? 'block' : 'none';
        if (rule.needsSecondSession) {
            document.getElementById('secondScheduleSection').style.display = 'block';
            document.getElementById('dayOfWeek2').required = true;
            _applyEndOffset('startLesson2', 'endLesson2', rule.endOffset);
            updateLessonPreview2();
        }
    }
}

// ── Called when Tiết bắt đầu (session 1) changes ────────────
function onStartLessonChange() {
    const startL  = parseInt(document.getElementById('startLesson')?.value);
    if (INVALID_START_LESSONS.has(startL)) {
        showToast(`Tiết ${startL} không thể là tiết bắt đầu (cuối buổi học). Vui lòng chọn tiết khác.`, 'error');
        document.getElementById('startLesson').value = startL === 5 ? '4' : '12';
    }
    const credits = parseInt(document.getElementById('credits')?.value);
    const rule    = CREDIT_RULES[credits];
    if (rule) _applyEndOffset('startLesson', 'endLesson', rule.endOffset);
    updateLessonPreview();
}

// ── Called when Tiết bắt đầu (session 2) changes ────────────
function onStartLesson2Change() {
    const startL  = parseInt(document.getElementById('startLesson2')?.value);
    if (INVALID_START_LESSONS.has(startL)) {
        showToast(`Tiết ${startL} không thể là tiết bắt đầu (cuối buổi học). Vui lòng chọn tiết khác.`, 'error');
        document.getElementById('startLesson2').value = startL === 5 ? '4' : '12';
    }
    const credits = parseInt(document.getElementById('credits')?.value);
    const rule    = CREDIT_RULES[credits];
    if (rule) _applyEndOffset('startLesson2', 'endLesson2', rule.endOffset);
    updateLessonPreview2();
}

// ── Called when Tiết kết thúc (session 1) changes ────────────
function onEndLessonChange() {
    const credits = parseInt(document.getElementById('credits')?.value);
    const rule    = CREDIT_RULES[credits];
    if (rule) _applyStartOffset('endLesson', 'startLesson', rule.endOffset);
    updateLessonPreview();
}

// ── Called when Tiết kết thúc (session 2) changes ────────────
function onEndLesson2Change() {
    const credits = parseInt(document.getElementById('credits')?.value);
    const rule    = CREDIT_RULES[credits];
    if (rule) _applyStartOffset('endLesson2', 'startLesson2', rule.endOffset);
    updateLessonPreview2();
}

function _applyStartOffset(endId, startId, offset) {
    const endL = parseInt(document.getElementById(endId)?.value) || 3;
    const startEl = document.getElementById(startId);
    if (!startEl) return;
    
    let newStart = endL - offset;
    if (newStart < 1) newStart = 1;
    
    if (INVALID_START_LESSONS.has(newStart)) {
        showToast(`Tiết kết thúc bạn chọn khiến tiết bắt đầu rơi vào tiết ${newStart} (cuối buổi học). Vui lòng chọn lại.`, 'error');
        newStart = newStart === 5 ? 4 : 12;
        document.getElementById(endId).value = String(Math.min(newStart + offset, 13));
    }
    startEl.value = String(newStart);
}

function _applyEndOffset(startId, endId, offset) {
    const startL = parseInt(document.getElementById(startId)?.value) || 1;
    const endEl  = document.getElementById(endId);
    if (endEl) endEl.value = String(Math.min(startL + offset, 13));
}

function updateLessonPreview2() {
    const s   = parseInt(document.getElementById('startLesson2')?.value);
    const e   = parseInt(document.getElementById('endLesson2')?.value);
    const box = document.getElementById('lessonTimePreview2');
    if (!box) return;
    if (s && e && s <= e) {
        box.className = 'time-preview';
        box.innerHTML = `<ion-icon name="time-outline"></ion-icon>
            <strong>Tiết ${s} → Tiết ${e}</strong>&nbsp;&nbsp;
            ${LESSON_TIMES[s]} – ${LESSON_END_TIMES[e]}&nbsp;
            <span style="opacity:.7">(${e - s + 1} tiết)</span>`;
    } else {
        box.className = 'time-preview error';
        box.innerHTML = `<ion-icon name="warning-outline"></ion-icon> Tiết bắt đầu không được lớn hơn tiết kết thúc!`;
    }
}

function updateLessonPreview() {
    const s   = parseInt(document.getElementById('startLesson')?.value);
    const e   = parseInt(document.getElementById('endLesson')?.value);
    const box = document.getElementById('lessonTimePreview');
    if (!box) return;
    if (s && e && s <= e) {
        box.className = 'time-preview';
        box.innerHTML = `<ion-icon name="time-outline"></ion-icon>
            <strong>Tiết ${s} → Tiết ${e}</strong>&nbsp;&nbsp;
            ${LESSON_TIMES[s]} – ${LESSON_END_TIMES[e]}&nbsp;
            <span style="opacity:.7">(${e - s + 1} tiết)</span>`;
    } else {
        box.className = 'time-preview error';
        box.innerHTML = `<ion-icon name="warning-outline"></ion-icon> Tiết bắt đầu không được lớn hơn tiết kết thúc!`;
    }
}

// ══════════════════════════════════════════════════════════════
//  SEMESTER
// ══════════════════════════════════════════════════════════════
async function loadSemestersIntoSelect() {
    const semSel = document.getElementById('semester');
    if (!semSel) return;

    try {
        const res = await authFetch(`${API_BASE_URL}/admin/semesters`);
        if (!res.ok) throw new Error();
        semesterCache = await res.json();

        semSel.innerHTML = '<option value="">-- Chọn học kỳ --</option>';
        semesterCache.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.label;
            opt.textContent = s.labelFull || s.label;  // e.g. "Học kỳ 1 - 2025-2026"
            if (s.isActive) opt.style.fontWeight = '700';
            semSel.appendChild(opt);
        });

        // Auto-select active semester
        const active = semesterCache.find(s => s.isActive);
        if (active) {
            semSel.value = active.label;
            onSemesterSelectChange();
        }
    } catch {
        semSel.innerHTML = `
            <option value="">-- Chọn học kỳ --</option>
            <option value="HK1 — 2024-2025">Học kỳ 1 — 2024-2025</option>
            <option value="HK2 — 2024-2025">Học kỳ 2 — 2024-2025</option>
            <option value="HK1 — 2025-2026" selected>Học kỳ 1 — 2025-2026</option>
            <option value="HK2 — 2025-2026">Học kỳ 2 — 2025-2026</option>`;
    }

    semSel.addEventListener('change', onSemesterSelectChange);
}

function onSemesterSelectChange() {
    const val = document.getElementById('semester')?.value;
    const sem = semesterCache.find(s => s.label === val);
    if (!sem) { document.getElementById('semesterInfoBox').className = 'sem-info-strip'; return; }

    // Auto-fill dates in Step 3
    if (sem.startDate) document.getElementById('startDate').value = sem.startDate;
    if (sem.endDate)   document.getElementById('endDate').value   = sem.endDate;

    // Show date range info strip (no Active badge)
    const start = sem.startDate ? new Date(sem.startDate+'T00:00:00').toLocaleDateString('vi-VN') : 'N/A';
    const end   = sem.endDate   ? new Date(sem.endDate+'T00:00:00').toLocaleDateString('vi-VN')   : 'N/A';

    const box = document.getElementById('semesterInfoBox');
    box.className = 'sem-info-strip show';
    box.innerHTML = `<ion-icon name="calendar-number-outline"></ion-icon>
        <span>${start} → ${end}</span>`;

    // Populate filter dropdown
    populateSemFilterDropdown();
}

function populateSemFilterDropdown() {
    const sel = document.getElementById('filterSem');
    if (!sel || semesterCache.length === 0) return;
    const cur = sel.value;
    sel.innerHTML = '<option value="">Tất cả học kỳ</option>';
    semesterCache.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.label;
        opt.textContent = s.labelFull || s.label;
        sel.appendChild(opt);
    });
    sel.value = cur;
}

// ══════════════════════════════════════════════════════════════
//  LOAD & RENDER COURSES
// ══════════════════════════════════════════════════════════════
async function loadCourses() {
    const tbody = document.getElementById('courseTable');
    try {
        const res  = await authFetch(`${API_BASE_URL}/admin/courses`);
        const data = await res.json();

        allAdminCourses = data || [];
        renderCourses(allAdminCourses);

        // Populate semester filter from loaded data
        if (semesterCache.length === 0) {
            const sems = [...new Set(allAdminCourses.map(c => c.semester).filter(Boolean))];
            const sel  = document.getElementById('filterSem');
            sems.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); });
        }
    } catch {
        tbody.innerHTML = `<tr><td colspan="7" class="tbl-empty">
            <ion-icon name="wifi-outline"></ion-icon>
            Lỗi tải dữ liệu — kiểm tra kết nối máy chủ.
        </td></tr>`;
    }
}

function renderCourses(list) {
    const tbody = document.getElementById('courseTable');
    const countEl = document.getElementById('courseCount');

    if (!list || list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="tbl-empty">
            <ion-icon name="albums-outline"></ion-icon>
            Chưa có khóa học nào. Nhấn <strong>Thêm Môn Mới</strong> để tạo.
        </td></tr>`;
        if (countEl) countEl.textContent = '';
        return;
    }

    if (countEl) countEl.textContent = `${list.length} lớp học phần`;

    tbody.innerHTML = list.map(c => {
        // Schedule chip
        let scheduleHtml;
        if (c.dayOfWeek && c.startLesson) {
            scheduleHtml = `
                <div class="schedule-chip">
                    <ion-icon name="calendar-outline" style="font-size:13px;color:var(--primary);"></ion-icon>
                    ${DOW_LABELS[c.dayOfWeek]} · Tiết ${c.startLesson}–${c.endLesson}
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px;padding-left:2px;">
                    ${LESSON_TIMES[c.startLesson]} – ${LESSON_END_TIMES[c.endLesson]}
                    &nbsp;·&nbsp; ${c.room || 'N/A'}
                </div>`;
        } else {
            scheduleHtml = `<span class="schedule-chip no-schedule">Chưa xếp lịch</span>`;
        }

        // Teacher avatar initials
        const initials = (c.teacherName || 'GV').split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();

        return `
        <tr>
            <td style="color:var(--text-muted);font-size:12px;">#${c.id}</td>
            <td>
                <span class="subject-badge">${c.subjectCode}</span>
                <div style="font-weight:600;margin:5px 0 3px;">${c.subjectName}</div>
                <span class="credits-badge"><ion-icon name="star-outline" style="font-size:10px;"></ion-icon> ${c.credits || 3} TC</span>
            </td>
            <td>
                <div style="font-weight:600;font-size:13px;">${c.className}</div>
            </td>
            <td>${scheduleHtml}</td>
            <td>
                <span class="sem-tag">${c.semester}</span>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                    ${c.startDate ? new Date(c.startDate+'T00:00:00').toLocaleDateString('vi-VN') : '?'}
                    → ${c.endDate ? new Date(c.endDate+'T00:00:00').toLocaleDateString('vi-VN') : '?'}
                </div>
            </td>
            <td>
                <div class="teacher-info">
                    <div class="teacher-avatar">${initials}</div>
                    <div>
                        <div class="teacher-name">${c.teacherName}</div>
                        <div class="teacher-email">${c.teacherEmail}</div>
                    </div>
                </div>
            </td>
            <td style="text-align:center;white-space:nowrap;">
                <button class="action-btn edit" onclick="editCourse(${c.id})">
                    <ion-icon name="pencil-outline"></ion-icon> Sửa
                </button>
                <button class="action-btn delete" onclick="askDeleteCourse(${c.id}, '${(c.subjectName||'').replace(/'/g, '')}')"
                        style="margin-left:5px;">
                    <ion-icon name="trash-outline"></ion-icon> Xóa
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ══════════════════════════════════════════════════════════════
//  FILTER
// ══════════════════════════════════════════════════════════════
function filterCourses() {
    const q   = document.getElementById('filterSearch').value.toLowerCase();
    const sem = document.getElementById('filterSem').value;
    const day = document.getElementById('filterDay').value;

    const filtered = allAdminCourses.filter(c => {
        const matchQ   = !q || [c.subjectCode, c.subjectName, c.teacherName, c.teacherEmail, c.className]
                                .some(v => (v||'').toLowerCase().includes(q));
        const matchSem = !sem || c.semester === sem;
        const matchDay = !day || String(c.dayOfWeek) === day;
        return matchQ && matchSem && matchDay;
    });

    renderCourses(filtered);
}

// ══════════════════════════════════════════════════════════════
//  STEP NAVIGATION
// ══════════════════════════════════════════════════════════════
function goStep(n) {
    // Only allow going back or staying; forward only via nextStep()
    if (n > currentStep) return;
    _setStep(n);
}

function _setStep(n) {
    currentStep = n;
    for (let i = 1; i <= TOTAL_STEPS; i++) {
        document.getElementById(`step${i}`)?.classList.toggle('active', i === n);
        const tab = document.getElementById(`tab${i}`);
        if (tab) {
            tab.classList.toggle('active', i === n);
            tab.classList.toggle('done', i < n);
        }
    }
    document.getElementById('btnPrev').style.display  = n > 1 ? 'inline-flex' : 'none';
    document.getElementById('btnNext').style.display  = n < TOTAL_STEPS ? 'inline-flex' : 'none';
    document.getElementById('submitBtn').style.display = n === TOTAL_STEPS ? 'inline-flex' : 'none';
}

function nextStep() {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) _setStep(currentStep + 1);
}

function prevStep() {
    if (currentStep > 1) _setStep(currentStep - 1);
}

function validateStep(step) {
    if (step === 1) {
        if (!document.getElementById('subjectCode').value.trim()) { showToast('Vui lòng nhập Mã Môn Học.', 'error'); return false; }
        if (!document.getElementById('subjectName').value.trim()) { showToast('Vui lòng nhập Tên Môn Học.', 'error'); return false; }
        if (!document.getElementById('semester').value)           { showToast('Vui lòng chọn Học Kỳ.', 'error'); return false; }
    }
    if (step === 2) {
        if (!document.getElementById('teacherId').value)          { showToast('Vui lòng chọn Giảng Viên.', 'error'); return false; }
        if (!document.getElementById('className').value.trim())   { showToast('Vui lòng nhập Tên Nhóm/Lớp.', 'error'); return false; }
        if (!document.getElementById('room').value.trim())        { showToast('Vui lòng nhập Phòng Học.', 'error'); return false; }
    }
    return true;
}

// ══════════════════════════════════════════════════════════════
//  OPEN / CLOSE MODAL
// ══════════════════════════════════════════════════════════════
async function openCreateModal() {
    editingCourseId = null;
    document.getElementById('modalTitle').textContent = 'Thêm Môn Học Mới';
    document.getElementById('courseForm').reset();
    
    // Đặt lại trạng thái nút submit (chống kẹt Đang lưu...)
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> <span id="submitLabel">Tạo & Phân Công</span>';
    } else {
        const lbl = document.getElementById('submitLabel');
        if (lbl) lbl.textContent = 'Tạo & Phân Công';
    }

    // Reset bonus UI elements not cleared by reset()
    const banner = document.getElementById('creditInfoBanner');
    if (banner) banner.style.display = 'none';
    const sec = document.getElementById('secondScheduleSection');
    if (sec) sec.style.display = 'none';
    const semBox = document.getElementById('semesterInfoBox');
    if (semBox) semBox.className = 'sem-info-strip';

    populateLessonSelects();
    _setStep(1);

    document.getElementById('courseModal').classList.add('open');

    try {
        const [tcrRes] = await Promise.all([authFetch(`${API_BASE_URL}/admin/teachers`)]);
        const teachers = await tcrRes.json();
        const sel = document.getElementById('teacherId');
        sel.innerHTML = '<option value="">-- Chọn giảng viên --</option>';
        teachers.forEach(t => {
            const o = document.createElement('option');
            o.value = t.id;
            o.textContent = `${t.fullName}  (${t.email})`;
            sel.appendChild(o);
        });
    } catch {
        showToast('Lỗi khi tải danh sách giảng viên.', 'error');
    }

    await loadSemestersIntoSelect();

    // Apply credit rules for default value (3 tín)
    onCreditsChange();
}

function closeCreateModal() {
    document.getElementById('courseModal').classList.remove('open');
    editingCourseId = null;
}

// Close on overlay click
document.getElementById('courseModal').addEventListener('click', function(e) {
    if (e.target === this) closeCreateModal();
});

// ══════════════════════════════════════════════════════════════
//  EDIT COURSE
// ══════════════════════════════════════════════════════════════
async function editCourse(id) {
    const course = allAdminCourses.find(c => c.id === id);
    if (!course) return;

    await openCreateModal();
    editingCourseId = id;
    document.getElementById('modalTitle').textContent     = 'Cập Nhật Môn Học';
    document.getElementById('submitLabel').textContent    = 'Lưu Thay Đổi';

    document.getElementById('subjectCode').value  = course.subjectCode  || '';
    document.getElementById('subjectName').value  = course.subjectName  || '';
    document.getElementById('credits').value      = course.credits      || '3';
    document.getElementById('className').value    = course.className    || '';
    document.getElementById('room').value         = course.room         || '';
    document.getElementById('dayOfWeek').value    = course.dayOfWeek    || 2;
    document.getElementById('startLesson').value  = course.startLesson  || 1;
    document.getElementById('endLesson').value    = course.endLesson    || 3;
    document.getElementById('startDate').value    = course.startDate    || '';
    document.getElementById('endDate').value      = course.endDate      || '';
    document.getElementById('teacherId').value    = course.teacherId    || '';

    const rule = CREDIT_RULES[parseInt(course.credits || '3')];
    if (rule) {
        const banner = document.getElementById('creditInfoBanner');
        if (banner) {
            banner.style.display     = 'flex';
            banner.style.background  = rule.color;
            banner.style.borderColor = rule.border;
            banner.style.color       = rule.text;
            banner.innerHTML = `<ion-icon name="information-circle-outline" style="font-size:16px;flex-shrink:0;"></ion-icon>
                <span><strong>${rule.label}:</strong> ${rule.desc}</span>`;
        }
        const sec = document.getElementById('secondScheduleSection');
        if (sec) sec.style.display = rule.needsSecondSession ? 'block' : 'none';
        document.getElementById('dayOfWeek2').required = !!rule.needsSecondSession;
    }

    // Pre-fill buổi 2 (nếu môn học thuộc loại cần 2 buổi và có dữ liệu)
    if (course.dayOfWeek2 && rule && rule.needsSecondSession) {
        document.getElementById('dayOfWeek2').value    = course.dayOfWeek2    || 2;
        document.getElementById('startLesson2').value  = course.startLesson2  || 1;
        document.getElementById('endLesson2').value    = course.endLesson2    || 3;
        updateLessonPreview2();
    }

    // Match semester
    const semSel = document.getElementById('semester');
    const match  = Array.from(semSel.options).find(o => o.value === course.semester);
    if (match) semSel.value = course.semester;

    updateLessonPreview();
    const sem = semesterCache.find(s => s.label === course.semester);
    if (sem) {
        const box = document.getElementById('semesterInfoBox');
        const start = sem.startDate ? new Date(sem.startDate+'T00:00:00').toLocaleDateString('vi-VN') : 'N/A';
        const end   = sem.endDate   ? new Date(sem.endDate+'T00:00:00').toLocaleDateString('vi-VN')   : 'N/A';
        box.className = 'sem-info-strip show';
        box.innerHTML = `<ion-icon name="calendar-number-outline"></ion-icon> <span>${start} → ${end}</span>`;
    }
}

// ══════════════════════════════════════════════════════════════
//  SUBMIT
// ══════════════════════════════════════════════════════════════
document.getElementById('courseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    const startL = parseInt(document.getElementById('startLesson').value);
    const endL   = parseInt(document.getElementById('endLesson').value);
    if (startL > endL) { showToast('Tiết bắt đầu phải ≤ tiết kết thúc!', 'error'); return; }

    const startDate = document.getElementById('startDate').value;
    const endDate   = document.getElementById('endDate').value;
    if (!startDate || !endDate) { showToast('Vui lòng nhập ngày bắt đầu và kết thúc.', 'error'); return; }
    if (new Date(startDate) >= new Date(endDate)) { showToast('Ngày bắt đầu phải trước ngày kết thúc!', 'error'); return; }

    const semLabel = document.getElementById('semester').value;
    const selectedSem = semesterCache.find(s => s.label === semLabel);
    if (selectedSem?.startDate && selectedSem?.endDate) {
        // So sánh string ISO trực tiếp — tránh lệch múi giờ UTC vs local
        if (startDate < selectedSem.startDate || endDate > selectedSem.endDate) {
            const disp = (d) => new Date(d + 'T00:00:00').toLocaleDateString('vi-VN');
            showToast(`Ngày học phải nằm trong học kỳ: ${disp(selectedSem.startDate)} → ${disp(selectedSem.endDate)}`, 'error');
            return;
        }
    }

    const credits = parseInt(document.getElementById('credits').value);
    const rule    = CREDIT_RULES[credits];

    const payload = {
        subjectCode: document.getElementById('subjectCode').value.trim(),
        subjectName: document.getElementById('subjectName').value.trim(),
        credits,
        className:   document.getElementById('className').value.trim(),
        room:        document.getElementById('room').value.trim(),
        dayOfWeek:   parseInt(document.getElementById('dayOfWeek').value),
        startLesson: startL,
        endLesson:   endL,
        teacherId:   parseInt(document.getElementById('teacherId').value),
        semester:    semLabel,
        semesterId:  selectedSem?.id || null,
        startDate,
        endDate
    };

    // Cho môn cần 2 buổi (2TC và 4TC): validate buổi 2
    if (rule?.needsSecondSession) {
        const s2 = parseInt(document.getElementById('startLesson2')?.value);
        const e2 = parseInt(document.getElementById('endLesson2')?.value);
        const d2 = parseInt(document.getElementById('dayOfWeek2')?.value);
        if (!d2 || !s2 || !e2) { showToast(`Vui lòng điền đủ thông tin Buổi 2 cho môn ${credits} tín chỉ.`, 'error'); return; }
        if (s2 > e2) { showToast('Buổi 2: Tiết bắt đầu phải ≤ tiết kết thúc!', 'error'); return; }
        payload.dayOfWeek2   = d2;
        payload.startLesson2 = s2;
        payload.endLesson2   = e2;
    }

    try {
        const url    = editingCourseId ? `${API_BASE_URL}/admin/courses/${editingCourseId}` : `${API_BASE_URL}/admin/courses`;
        const method = editingCourseId ? 'PUT' : 'POST';
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Đang lưu...'; }

        const res    = await authFetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });

        if (res.ok) {
            showToast(editingCourseId ? '✅ Cập nhật thành công!' : '✅ Tạo môn học và phân công thành công!');
            closeCreateModal();
            loadCourses();
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Lỗi từ máy chủ.', 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = `<ion-icon name="checkmark-outline"></ion-icon> <span id="submitLabel">${editingCourseId ? 'Lưu Thay Đổi' : 'Tạo & Phân Công'}</span>`; }
        }
    } catch {
        showToast('Lỗi kết nối mạng!', 'error');
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> <span id="submitLabel">Xác nhận</span>'; }
    }
});

// ══════════════════════════════════════════════════════════════
//  DELETE COURSE
// ══════════════════════════════════════════════════════════════
let _deletingCourseId = null;

function askDeleteCourse(id, name) {
    _deletingCourseId = id;
    const textEl = document.getElementById('confirmDeleteText');
    if (textEl) textEl.textContent = `Bạn sắp xóa học phần “${name}”. Hành động này không thể hoàn tác.`;
    document.getElementById('confirmDeleteModal').classList.add('open');
}

function closeConfirmDelete() {
    _deletingCourseId = null;
    document.getElementById('confirmDeleteModal').classList.remove('open');
}

async function confirmDeleteCourse() {
    if (!_deletingCourseId) return;
    const btn = document.getElementById('btnConfirmDelete');
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Đang xóa...';

    try {
        const res = await authFetch(`${API_BASE_URL}/admin/courses/${_deletingCourseId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('✅ Xóa học phần thành công!', 'success');
            closeConfirmDelete();
            loadCourses();
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Không thể xóa học phần này.', 'error');
        }
    } catch {
        showToast('Lỗi kết nối mạng!', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<ion-icon name="trash-outline"></ion-icon> Xóa';
    }
}

// Close confirm modal on overlay click
document.getElementById('confirmDeleteModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeConfirmDelete();
});

// ══════════════════════════════════════════════════════════════
//  SYNC SCHEDULES — Backfill lịch cho data cũ (1 lần)
// ══════════════════════════════════════════════════════════════
async function syncSchedules() {
    const btn = document.getElementById('syncBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Đang đồng bộ...'; }
    try {
        const res  = await authFetch(`${API_BASE_URL}/admin/courses/sync-schedules`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            showToast(`✅ Đồng bộ xong! Đã tạo ${data.schedulesCreated} lịch, liên kết ${data.semestersLinked} học kỳ / ${data.totalCourses} môn.`);
            loadCourses();
        } else {
            showToast(data.error || 'Lỗi khi đồng bộ.', 'error');
        }
    } catch {
        showToast('Lỗi kết nối mạng!', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<ion-icon name="sync-outline"></ion-icon> Đồng bộ lịch'; }
    }
}
