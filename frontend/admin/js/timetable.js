
const LESSON_TIMES = {
    1: '06:45', 2: '07:45', 3: '08:45', 4: '09:45', 5: '10:45',
    6: '12:30', 7: '13:30', 8: '14:30', 9: '15:30', 10: '16:30',
    11: '17:30', 12: '18:30', 13: '19:30'
};
const LESSON_END_TIMES = {
    1: '07:35', 2: '08:35', 3: '09:35', 4: '10:35', 5: '11:35',
    6: '13:20', 7: '14:20', 8: '15:20', 9: '16:20', 10: '17:20',
    11: '18:20', 12: '19:20', 13: '20:20'
};

function hashCode(str) {
    if (!str) return 0;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

const DOW_LABELS = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
const DAY_HEADERS = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

// Blue monochrome palette — nhất quán cho toàn hệ thống
const CARD_COLORS = [
    { bg: '#dbeafe', border: '#2563eb', text: '#1e3a8a' },
    { bg: '#dbeafe', border: '#1d4ed8', text: '#1e3a8a' },
    { bg: '#dbeafe', border: '#1e40af', text: '#1e3a8a' },
    { bg: '#dbeafe', border: '#3b82f6', text: '#1e3a8a' },
    { bg: '#dbeafe', border: '#1565c0', text: '#1e3a8a' },
];

let allCourses = [];
let weekData = [];
let semesterDBCache = [];
// --- Khởi động ---
document.addEventListener('DOMContentLoaded', () => {
    loadTimetable();
    document.getElementById('btnPrevWeek').addEventListener('click', () => navigateWeek(-1));
    document.getElementById('btnNextWeek').addEventListener('click', () => navigateWeek(+1));
});

function navigateWeek(delta) {
    const sel = document.getElementById('weekFilter');
    if (!sel) return;
    const next = parseInt(sel.value) + delta;
    if (next >= 0 && next < weekData.length) {
        sel.value = next;
        renderGrid();
        updateWeekNav();
    }
}

function updateWeekNav() {
    const sel = document.getElementById('weekFilter');
    if (!sel) return;
    const cur = parseInt(sel.value);
    document.getElementById('btnPrevWeek').disabled = cur <= 0;
    document.getElementById('btnNextWeek').disabled = cur >= weekData.length - 1;
    if (weekData[cur]) {
        const w = weekData[cur];
        const fmt = d => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        document.getElementById('weekLabel').textContent = `Tuần ${w.num}  ·  ${fmt(w.start)} – ${fmt(w.end)}`;
    }
}

// --- Load ---
async function loadTimetable() {
    document.getElementById('loadingMsg').style.display = 'block';
    document.getElementById('timetableWrapper').style.display = 'none';
    try {
        const [courseRes, semRes] = await Promise.all([
            authFetch(`${API_BASE_URL}/admin/courses`),
            authFetch(`${API_BASE_URL}/admin/semesters`)
        ]);
        if (!courseRes.ok) throw new Error('Không thể tải dữ liệu thời khóa biểu');
        allCourses = await courseRes.json();
        if (semRes.ok) semesterDBCache = await semRes.json();
        populateAdminFilters();
        renderGrid();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        document.getElementById('loadingMsg').style.display = 'none';
        document.getElementById('timetableWrapper').style.display = 'block';
    }
}

// --- Populate filters ---
function populateAdminFilters() {
    // Học kỳ
    const semSet = [...new Set(allCourses.map(c => c.semester).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    const semSel = document.getElementById('semesterFilter');
    semSel.innerHTML = '<option value="ALL">— Tất cả học kỳ —</option>';
    semSet.forEach(s => {
        const dbSem = semesterDBCache.find(d => d.label === s);
        const name = dbSem ? dbSem.labelFull : s;
        semSel.innerHTML += `<option value="${s}">${name}</option>`;
    });
    // Tự chọn học kỳ đang active
    const activeSem = semesterDBCache.find(d => d.isActive);
    if (activeSem) {
        const found = Array.from(semSel.options).find(o => o.value === activeSem.label);
        semSel.value = found ? activeSem.label : (semSet.length > 0 ? semSet[0] : 'ALL');
    } else {
        semSel.value = semSet.length > 0 ? semSet[0] : 'ALL';
    }

    // Giảng viên
    const teacherMap = new Map();
    allCourses.forEach(c => {
        const tName = c.teacherName || c.teacher?.profile?.fullName;
        if (tName) teacherMap.set(tName, c.teacherEmail || c.teacher?.email || '');
    });
    const teacherSel = document.getElementById('teacherFilter');
    teacherSel.innerHTML = '';
    if (teacherMap.size === 0) {
        teacherSel.innerHTML = '<option value="">— Chưa có giảng viên —</option>';
    } else {
        teacherMap.forEach((email, name) => {
            teacherSel.innerHTML += `<option value="${name}">${name}${email ? ' (' + email + ')' : ''}</option>`;
        });
    }

    onSemesterChange();
}

function onSemesterChange() {
    const semSel = document.getElementById('semesterFilter');
    const sel = semSel ? semSel.value : 'ALL';
    const list = sel === 'ALL' ? allCourses : allCourses.filter(c => c.semester === sel);
    computeWeeks(list);
    renderGrid();
}

// --- Tính danh sách tuần ---
function computeWeeks(courses) {
    const weekSel = document.getElementById('weekFilter');
    if (!weekSel) return;
    weekSel.innerHTML = '';
    weekData = [];
    if (!courses || courses.length === 0) {
        weekSel.innerHTML = '<option value="-1">Không có dữ liệu</option>';
        updateWeekNav(); return;
    }
    let minD = new Date('2099-01-01'), maxD = new Date('1970-01-01'), hasData = false;
    courses.forEach(c => {
        if (c.startDate) { const d = new Date(c.startDate); if (d < minD) minD = d; hasData = true; }
        if (c.endDate) { const d = new Date(c.endDate); if (d > maxD) maxD = d; hasData = true; }
    });
    if (!hasData || minD > maxD) {
        weekSel.innerHTML = '<option value="-1">Không có dữ liệu</option>';
        updateWeekNav(); return;
    }
    const day = minD.getDay();
    const startWeek = new Date(minD);
    startWeek.setDate(minD.getDate() - day + (day === 0 ? -6 : 1));
    let curWeek = new Date(startWeek), weekNum = 1, currentWeekIndex = 0;
    const now = new Date();
    while (curWeek <= maxD) {
        const endW = new Date(curWeek);
        endW.setDate(endW.getDate() + 6);
        const fmt = d => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        weekData.push({ label: `Tuần ${weekNum} (${fmt(curWeek)} – ${fmt(endW)})`, num: weekNum, start: new Date(curWeek), end: new Date(endW) });
        if (now >= curWeek && now <= endW) currentWeekIndex = weekNum - 1;
        curWeek.setDate(curWeek.getDate() + 7);
        weekNum++;
    }
    weekData.forEach((w, i) => weekSel.innerHTML += `<option value="${i}">${w.label}</option>`);
    if (weekData.length > 0) weekSel.value = Math.min(currentWeekIndex, weekData.length - 1).toString();
    updateWeekNav();
}

// --- Render lưới TKB ---
function renderGrid() {
    const filterSem = document.getElementById('semesterFilter')?.value || 'ALL';
    const filterTeacher = document.getElementById('teacherFilter')?.value || '';
    const weekSelValue = document.getElementById('weekFilter')?.value;

    const grid = document.getElementById('tkbGrid');
    if (!grid) return;
    grid.innerHTML = '';
    updateWeekNav();

    const weekStart = _getWeekStart(weekSelValue);
    const today = new Date(); today.setHours(0, 0, 0, 0);

    _buildGridHeader(grid, weekStart, today);
    _buildEmptyCells(grid);

    let filtered = _filterCourses(allCourses, filterSem, weekSelValue);
    // Lọc theo giảng viên được chọn
    if (filterTeacher) {
        filtered = filtered.filter(c => {
            const tName = c.teacherName || c.teacher?.profile?.fullName;
            return tName === filterTeacher;
        });
    }

    const countEl = document.getElementById('courseCount');
    if (countEl) countEl.textContent = filtered.length;

    _renderCourseCards(grid, filtered, weekSelValue);
}

// ── Helper: lấy weekStart từ weekSelValue ───────────────────
function _getWeekStart(weekSelValue) {
    if (weekSelValue && weekSelValue !== '-1' && weekData.length > parseInt(weekSelValue)) {
        return weekData[parseInt(weekSelValue)].start;
    }
    return null;
}

// ── Helper: lọc courses theo kỳ + tuần ─────────────────────
function _filterCourses(courses, filterSem, weekSelValue) {
    let filtered = courses;
    if (filterSem !== 'ALL') filtered = filtered.filter(c => c.semester === filterSem);
    if (weekSelValue && weekSelValue !== '-1' && weekData.length > parseInt(weekSelValue)) {
        const sel = weekData[parseInt(weekSelValue)];
        filtered = filtered.filter(c => {
            if (!c.startDate || !c.endDate) return false;
            const sd = new Date(c.startDate), ed = new Date(c.endDate);
            sd.setHours(0, 0, 0, 0); ed.setHours(23, 59, 59, 999);
            const ws = new Date(sel.start); ws.setHours(0, 0, 0, 0);
            const we = new Date(sel.end); we.setHours(23, 59, 59, 999);
            return sd <= we && ed >= ws;
        });
    }
    return filtered;
}

// ── Helper: dựng header hàng đầu ───────────────────────────
function _buildGridHeader(grid, weekStart, today) {
    const corner = document.createElement('div');
    corner.className = 'tkb-header tkb-corner';
    corner.innerHTML = `<ion-icon name="calendar-outline" style="font-size:20px;color:rgba(255,255,255,0.7);"></ion-icon>`;
    grid.appendChild(corner);

    for (let col = 1; col <= 7; col++) {
        const div = document.createElement('div');
        div.className = 'tkb-header';
        let dateStr = '', isToday = false;
        if (weekStart) {
            const colDate = new Date(weekStart);
            colDate.setDate(weekStart.getDate() + (col - 1));
            dateStr = colDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            colDate.setHours(0, 0, 0, 0);
            isToday = colDate.getTime() === today.getTime();
        }
        if (isToday) {
            div.classList.add('tkb-header-today');
            div.innerHTML = `<div class="tkb-header-day">${DAY_HEADERS[col]}</div><div class="tkb-header-date today-badge">${dateStr}</div><div class="today-dot"></div>`;
        } else {
            div.innerHTML = `<div class="tkb-header-day">${DAY_HEADERS[col]}</div>${dateStr ? `<div class="tkb-header-date">${dateStr}</div>` : ''}`;
        }
        grid.appendChild(div);
    }
}

// ── Helper: dựng ô trống nền lưới ──────────────────────────
function _buildEmptyCells(grid) {
    const todayJS = new Date().getDay();
    const todayCol = todayJS === 0 ? 7 : todayJS;
    for (let i = 1; i <= 13; i++) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'tkb-time-label';
        timeDiv.style.gridRow = `${i + 1}`; timeDiv.style.gridColumn = '1';
        timeDiv.innerHTML = `<div class="lesson-num">Tiết ${i}</div><div class="lesson-time">${LESSON_TIMES[i]}</div>`;
        grid.appendChild(timeDiv);
        for (let d = 2; d <= 8; d++) {
            const empty = document.createElement('div');
            empty.className = 'tkb-cell-empty' + ((d - 1) === todayCol ? ' tkb-cell-today' : '');
            empty.style.gridRow = `${i + 1}`; empty.style.gridColumn = `${d}`;
            grid.appendChild(empty);
        }
    }
}

// ── Helper: render card môn học lên grid ────────────────────
function _renderCourseCards(grid, filtered, weekSelValue) {
    let sessions = [];
    filtered.forEach(c => {
        if (c.dayOfWeek && c.startLesson && c.endLesson) {
            sessions.push({ ...c, isSecondary: false, renderDay: c.dayOfWeek, renderStart: c.startLesson, renderEnd: c.endLesson });
        }
        if (c.dayOfWeek2 && c.startLesson2 && c.endLesson2) {
            sessions.push({ ...c, isSecondary: true, renderDay: c.dayOfWeek2, renderStart: c.startLesson2, renderEnd: c.endLesson2 });
        }
    });

    for (let d = 2; d <= 8; d++) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `grid-column:${d};grid-row:2/span 13;position:relative;pointer-events:none;overflow:hidden;`;
        grid.appendChild(wrapper);

        const dayCourses = sessions
            .filter(c => parseInt(c.renderDay) === d && c.renderStart && c.renderEnd)
            .sort((a, b) => a.renderStart - b.renderStart);

        dayCourses.forEach(course => {
            const overlapping = dayCourses.filter(o => o.renderStart <= course.renderEnd && o.renderEnd >= course.renderStart);
            const count = Math.max(1, overlapping.length);
            const idx = overlapping.findIndex(o => o.id === course.id && o.isSecondary === course.isSecondary);

            const card = document.createElement('div');
            card.className = 'tkb-course-card';
            card.style.cssText = `
                pointer-events:auto;position:absolute;
                top:calc(${(course.renderStart - 1) / 13 * 100}% + 3px);
                height:calc(${(course.renderEnd - course.renderStart + 1) / 13 * 100}% - 6px);
                width:calc(${100 / count}% - 6px);
                left:calc(${Math.max(0, idx) * (100 / count)}% + 3px);
                z-index:5;
            `;
            const color = CARD_COLORS[hashCode(course.subjectCode) % CARD_COLORS.length];
            card.style.backgroundColor = color.bg;
            card.style.borderLeftColor = color.border;

            const teacherName = course.teacherName || course.teacher?.profile?.fullName || 'N/A';
            const timeStr = `${LESSON_TIMES[course.renderStart]} → ${LESSON_END_TIMES[course.renderEnd]}`;

            card.innerHTML = `
                <div class="card-subject" style="color:${color.text};">${course.subjectName}</div>
                <div class="card-code"    style="color:${color.border};">${course.subjectCode}</div>
                <div class="card-meta">
                    <div class="card-row" style="color:${color.text};"><ion-icon name="people-outline"></ion-icon><span>Nhóm ${course.className || '—'}</span></div>
                    <div class="card-row" style="color:${color.text};"><ion-icon name="business-outline"></ion-icon><span>${course.room || 'N/A'}</span></div>
                    <div class="card-row" style="color:${color.text};"><ion-icon name="person-outline"></ion-icon><span>${teacherName}</span></div>
                    <div class="card-row card-time" style="color:${color.text};"><ion-icon name="time-outline"></ion-icon><span>${timeStr}</span></div>
                </div>
            `;
            card.title = `${course.subjectName} — Tiết ${course.renderStart}→${course.renderEnd}`;
            wrapper.appendChild(card);
        });
    }
}
