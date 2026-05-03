// ============================================================
//  TIMETABLE.JS — Teacher View  v8
//  Dùng endpoint /teacher/timetable (ScheduleService) thay vì /teacher/courses
//  Field mapping: startPeriod / endPeriod / courseId (ScheduleDTO)
// ============================================================

const LESSON_TIMES = {
    1:'06:45', 2:'07:45', 3:'08:45', 4:'09:45',  5:'10:45',
    6:'12:30', 7:'13:30', 8:'14:30', 9:'15:30', 10:'16:30',
    11:'17:30', 12:'18:30', 13:'19:30'
};
const LESSON_END_TIMES = {
    1:'07:35', 2:'08:35', 3:'09:35', 4:'10:35',  5:'11:35',
    6:'13:20', 7:'14:20', 8:'15:20', 9:'16:20', 10:'17:20',
    11:'18:20', 12:'19:20', 13:'20:20'
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

// ✅ Đầy đủ dấu tiếng Việt
const DOW_LABELS  = ['','','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','CN'];
const DAY_HEADERS = ['','Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','CN'];

// Blue monochrome palette — nhất quán cho toàn hệ thống
const CARD_COLORS = [
    { bg: '#dbeafe', border: '#1d4ed8', text: '#1e3a8a' },
    { bg: '#bfdbfe', border: '#1565c0', text: '#1e3a8a' },
    { bg: '#e0effe', border: '#2563eb', text: '#1e40af' },
    { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' },
    { bg: '#dbeafe', border: '#1e40af', text: '#1e3a8a' },
];

// allCourses: mảng flat các ScheduleDTO đã chuẩn hóa từ /teacher/timetable
let allCourses      = [];
let weekData        = [];
let semesterDBCache = [];

// --- Khởi động ---
document.addEventListener('DOMContentLoaded', () => {
    loadSemesters();
    document.getElementById('btnPrevWeek').addEventListener('click', () => navigateWeek(-1));
    document.getElementById('btnNextWeek').addEventListener('click', () => navigateWeek(+1));
});

function navigateWeek(delta) {
    const sel  = document.getElementById('weekFilter');
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
        const w   = weekData[cur];
        const fmt = d => d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
        document.getElementById('weekLabel').textContent = `Tuần ${w.num}  ·  ${fmt(w.start)} – ${fmt(w.end)}`;
    }
}

// --- Bước 1: Load danh sách học kỳ trước ---
async function loadSemesters() {
    document.getElementById('loadingMsg').style.display = 'block';
    document.getElementById('timetableWrapper').style.display = 'none';
    try {
        const semRes = await authFetch(`${API_BASE_URL}/teacher/semesters`);
        if (semRes.ok) semesterDBCache = await semRes.json();
        populateSemesterFilter();
    } catch (error) {
        console.error('[Teacher TKB] loadSemesters error:', error);
        showToast('Lỗi tải danh sách học kỳ.', 'error');
        document.getElementById('loadingMsg').style.display = 'none';
        document.getElementById('timetableWrapper').style.display = 'block';
    }
}

// --- Semester filter ---
function populateSemesterFilter() {
    const semSel = document.getElementById('semesterFilter');
    if (!semSel) return;
    semSel.innerHTML = '<option value="ALL">— Tất cả học kỳ —</option>';
    semesterDBCache.forEach(s => {
        semSel.innerHTML += `<option value="${s.id}">${s.labelFull || s.label}</option>`;
    });
    // Mặc định "Tất cả" để luôn hiện dữ liệu dù courses cũ chưa có semesterEntity
    semSel.value = 'ALL';
    // Kích hoạt load TKB lần đầu
    onSemesterChange();
}

// --- Bước 2: Mỗi khi đổi học kỳ → fetch /teacher/timetable?semesterId=X ---
async function onSemesterChange() {
    const semSel      = document.getElementById('semesterFilter');
    const selectedVal = semSel ? semSel.value : 'ALL';

    document.getElementById('loadingMsg').style.display = 'block';
    document.getElementById('timetableWrapper').style.display = 'none';

    try {
        const url = selectedVal === 'ALL'
            ? `${API_BASE_URL}/teacher/timetable`
            : `${API_BASE_URL}/teacher/timetable?semesterId=${selectedVal}`;

        const res = await authFetch(url);
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Lỗi tải thời khóa biểu (${res.status})`);
        }

        const data = await res.json(); // TimetableResponse: { schedulesByDay, totalCourses }

        // Flatten Map<dayOfWeek, List<ScheduleDTO>> → mảng phẳng để render
        allCourses = [];
        if (data.schedulesByDay) {
            Object.values(data.schedulesByDay).forEach(dayList => {
                dayList.forEach(s => allCourses.push(s));
            });
        }

    } catch (error) {
        console.error('[Teacher TKB] Error:', error);
        showToast(error.message, 'error');
        allCourses = [];
    } finally {
        document.getElementById('loadingMsg').style.display = 'none';
        document.getElementById('timetableWrapper').style.display = 'block';
        computeWeeks(allCourses);
        renderGrid();
    }
}

// --- Tính danh sách tuần ---
function computeWeeks(courses) {
    const weekSel = document.getElementById('weekFilter');
    if (!weekSel) return;
    weekSel.innerHTML = '';
    weekData = [];
    if (!courses || courses.length === 0) {
        weekSel.innerHTML = '<option value="-1">Không có dữ liệu</option>';
        updateWeekNav();
        return;
    }
    let minD = new Date('2099-01-01'), maxD = new Date('1970-01-01'), hasData = false;
    courses.forEach(c => {
        if (c.startDate) { const d = new Date(c.startDate); if (d < minD) minD = d; hasData = true; }
        if (c.endDate)   { const d = new Date(c.endDate);   if (d > maxD) maxD = d; hasData = true; }
    });
    if (!hasData || minD > maxD) {
        weekSel.innerHTML = '<option value="-1">Không có dữ liệu</option>';
        updateWeekNav();
        return;
    }
    const day = minD.getDay();
    const startWeek = new Date(minD);
    startWeek.setDate(minD.getDate() - day + (day === 0 ? -6 : 1));
    let curWeek = new Date(startWeek), weekNum = 1, currentWeekIndex = 0;
    const now = new Date();
    while (curWeek <= maxD) {
        const endW = new Date(curWeek);
        endW.setDate(endW.getDate() + 6);
        const fmt = d => d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
        weekData.push({ label:`Tuần ${weekNum} (${fmt(curWeek)} – ${fmt(endW)})`, num:weekNum, start:new Date(curWeek), end:new Date(endW) });
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
    const weekSelValue = document.getElementById('weekFilter')?.value;
    const grid         = document.getElementById('tkbGrid');
    grid.innerHTML     = '';
    updateWeekNav();

    let weekStart = null;
    if (weekSelValue && weekSelValue !== '-1' && weekData.length > parseInt(weekSelValue)) {
        weekStart = weekData[parseInt(weekSelValue)].start;
    }

    const today = new Date(); today.setHours(0,0,0,0);

    // Corner cell
    const cornerEl = document.createElement('div');
    cornerEl.className = 'tkb-header tkb-corner';
    cornerEl.innerHTML = `<ion-icon name="calendar-outline" style="font-size:20px;opacity:0.5;"></ion-icon>`;
    grid.appendChild(cornerEl);

    // Header hàng đầu: Thứ 2 → CN
    for (let col = 1; col <= 7; col++) {
        const div = document.createElement('div');
        div.className = 'tkb-header';
        let dateStr = '', isToday = false;
        if (weekStart) {
            const colDate = new Date(weekStart);
            colDate.setDate(weekStart.getDate() + (col - 1));
            dateStr = colDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            colDate.setHours(0,0,0,0);
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

    const todayJS  = new Date().getDay();
    const todayCol = todayJS === 0 ? 7 : todayJS;

    // Tiết + ô rỗng
    for (let i = 1; i <= 13; i++) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'tkb-time-label';
        timeDiv.style.gridRow    = `${i + 1}`;
        timeDiv.style.gridColumn = `1`;
        timeDiv.innerHTML = `<div class="lesson-num">Tiết ${i}</div><div class="lesson-time">${LESSON_TIMES[i]}</div>`;
        grid.appendChild(timeDiv);
        for (let d = 2; d <= 8; d++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'tkb-cell-empty';
            emptyDiv.style.gridRow    = `${i + 1}`;
            emptyDiv.style.gridColumn = `${d}`;
            if ((d - 1) === todayCol) emptyDiv.classList.add('tkb-cell-today');
            grid.appendChild(emptyDiv);
        }
    }

    // Lọc theo tuần (dùng startDate/endDate của course)
    let filtered = allCourses;
    if (weekSelValue && weekSelValue !== '-1' && weekData.length > parseInt(weekSelValue)) {
        const sel = weekData[parseInt(weekSelValue)];
        filtered = filtered.filter(c => {
            if (!c.startDate || !c.endDate) return false;
            const sd = new Date(c.startDate), ed = new Date(c.endDate);
            sd.setHours(0,0,0,0); ed.setHours(23,59,59,999);
            const ws = new Date(sel.start); ws.setHours(0,0,0,0);
            const we = new Date(sel.end);   we.setHours(23,59,59,999);
            return sd <= we && ed >= ws;
        });
    }

    // Render card môn học — dùng startPeriod / endPeriod (ScheduleDTO)
    for (let d = 2; d <= 8; d++) {
        const wrapper = document.createElement('div');
        wrapper.style.gridColumn    = `${d}`;
        wrapper.style.gridRow       = `2 / span 13`;
        wrapper.style.position      = 'relative';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.overflow      = 'hidden';
        grid.appendChild(wrapper);

        const dayCourses = filtered
            .filter(c => parseInt(c.dayOfWeek) === d && c.startPeriod && c.endPeriod)
            .sort((a, b) => a.startPeriod - b.startPeriod);

        dayCourses.forEach(course => {
            const overlapping = dayCourses.filter(o => o.startPeriod <= course.endPeriod && o.endPeriod >= course.startPeriod);
            const count = Math.max(1, overlapping.length);
            const idx   = overlapping.findIndex(o => o.courseId === course.courseId && o.scheduleId === course.scheduleId);

            const card = document.createElement('div');
            card.className = 'tkb-course-card';
            card.style.pointerEvents = 'auto';
            card.style.position  = 'absolute';
            card.style.top       = `calc(${(course.startPeriod - 1) / 13 * 100}% + 3px)`;
            card.style.height    = `calc(${(course.endPeriod - course.startPeriod + 1) / 13 * 100}% - 6px)`;
            card.style.width     = `calc(${100 / count}% - 6px)`;
            card.style.left      = `calc(${Math.max(0, idx) * (100 / count)}% + 3px)`;
            card.style.zIndex    = '5';

            const color = CARD_COLORS[hashCode(course.subjectCode) % CARD_COLORS.length];
            card.style.backgroundColor = color.bg;
            card.style.borderLeftColor  = color.border;

            // Dùng startTime/endTime từ ScheduleDTO (đã tính sẵn ở backend)
            const timeStr = `${course.startTime || LESSON_TIMES[course.startPeriod]} → ${course.endTime || LESSON_END_TIMES[course.endPeriod]}`;

            card.innerHTML = `
                <div class="card-subject" style="color:${color.text};">${course.subjectName}</div>
                <div class="card-code" style="color:${color.border};">${course.subjectCode}</div>
                <div class="card-meta">
                    <div class="card-row"><ion-icon name="people-outline"></ion-icon><span>Nhóm ${course.className || '—'}</span></div>
                    <div class="card-row"><ion-icon name="business-outline"></ion-icon><span>${course.room || 'N/A'}</span></div>
                    <div class="card-row card-time"><ion-icon name="time-outline"></ion-icon><span>${timeStr}</span></div>
                </div>
            `;
            card.title = `${course.subjectName} — Tiết ${course.startPeriod}→${course.endPeriod}`;
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => openCourseDetailModal(course));
            wrapper.appendChild(card);
        });
    }
}

// --- Modal chi tiết ---
function openCourseDetailModal(course) {
    const modal = document.getElementById('courseDetailModal');
    if (!modal) return;

    // Dùng startTime/endTime từ ScheduleDTO
    const timeStr      = `${course.startTime || LESSON_TIMES[course.startPeriod]} – ${course.endTime || LESSON_END_TIMES[course.endPeriod]}`;
    const startDateStr = course.startDate ? new Date(course.startDate + 'T00:00:00').toLocaleDateString('vi-VN') : 'N/A';
    const endDateStr   = course.endDate   ? new Date(course.endDate   + 'T00:00:00').toLocaleDateString('vi-VN') : 'N/A';

    // Tìm tên học kỳ đầy đủ từ cache
    const dbSem    = semesterDBCache.find(d => d.label === course.semester);
    const semLabel = dbSem ? dbSem.labelFull : (course.semester || 'N/A');

    document.getElementById('cdmSubject').textContent  = `${course.subjectCode} — ${course.subjectName}`;
    document.getElementById('cdmClass').textContent    = course.className || '—';
    document.getElementById('cdmRoom').textContent     = course.room || 'N/A';
    document.getElementById('cdmSchedule').textContent = `${course.dayOfWeekLabel || DOW_LABELS[course.dayOfWeek] || ''} | Tiết ${course.startPeriod}→${course.endPeriod} | ${timeStr}`;
    document.getElementById('cdmSemester').textContent = semLabel;
    document.getElementById('cdmPeriod').textContent   = `${startDateStr} → ${endDateStr}`;
    document.getElementById('cdmCredits').textContent  = `${course.credits || 'N/A'} tín chỉ`;

    document.getElementById('cdmBtnCreateSession').onclick = () => {
        storageSet('selected_course_id', course.courseId);
        window.location.href = 'create-session.html';
    };
    modal.style.display = 'flex';
}

function closeCourseDetailModal() {
    document.getElementById('courseDetailModal').style.display = 'none';
}
