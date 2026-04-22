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
const DOW_LABELS = ['','','Thu 2','Thu 3','Thu 4','Thu 5','Thu 6','Thu 7','CN'];

const CARD_COLORS = [
    { bg: '#bbdefb', border: '#1565c0', text: '#0d2f6e' },
    { bg: '#c8e6c9', border: '#2e7d32', text: '#1b4d1e' },
    { bg: '#fff9c4', border: '#f9a825', text: '#5d3b00' },
    { bg: '#e8d5f5', border: '#6a1b9a', text: '#3d0060' },
    { bg: '#ffccbc', border: '#bf360c', text: '#6d1e00' },
    { bg: '#b2dfdb', border: '#00695c', text: '#00332e' },
    { bg: '#f8bbd0', border: '#ad1457', text: '#6b0031' },
];

let allCourses = [];
let weekData   = [];
let semesterDBCache = [];

// --- Khoi dong ---
document.addEventListener('DOMContentLoaded', () => {
    loadTimetable();
    document.getElementById('btnPrevWeek').addEventListener('click', () => navigateWeek(-1));
    document.getElementById('btnNextWeek').addEventListener('click', () => navigateWeek(+1));
});

function navigateWeek(delta) {
    const sel = document.getElementById('weekFilter');
    if (!sel) return;
    const cur = parseInt(sel.value);
    const next = cur + delta;
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
        const fmt = d => d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
        document.getElementById('weekLabel').textContent = `Tuan ${w.num}  \u00b7  ${fmt(w.start)} \u2013 ${fmt(w.end)}`;
    }
}

// --- Load du lieu ---
async function loadTimetable() {
    document.getElementById('loadingMsg').style.display = 'block';
    document.getElementById('timetableWrapper').style.display = 'none';
    try {
        const [courseRes, semRes] = await Promise.all([
            authFetch(`${API_BASE_URL}/teacher/courses`),
            authFetch(`${API_BASE_URL}/teacher/semesters`)
        ]);
        if (!courseRes.ok) throw new Error('Khong the tai du lieu thoi khoa bieu');
        allCourses = await courseRes.json();
        if (semRes.ok) semesterDBCache = await semRes.json();
        populateSemesterFilter();
        renderGrid();
    } catch (error) {
        console.error('[Teacher TKB] Error:', error);
        showToast(error.message, 'error');
    } finally {
        document.getElementById('loadingMsg').style.display = 'none';
        document.getElementById('timetableWrapper').style.display = 'block';
    }
}

// --- Semester filter ---
function populateSemesterFilter() {
    const semSel = document.getElementById('semesterFilter');
    if (!semSel) return;
    const semesters = [...new Set(allCourses.map(c => c.semester).filter(Boolean))].sort((a,b) => b.localeCompare(a));
    semSel.innerHTML = '';
    if (semesters.length === 0) {
        semSel.innerHTML = '<option value="ALL">T\u1ea5t c\u1ea3 h\u1ecdc k\u1ef3</option>';
    } else {
        semesters.forEach(s => {
            const dbSem = semesterDBCache.find(d => d.label === s);
            const displayName = dbSem ? `${dbSem.labelFull}${dbSem.isActive ? ' \u2605' : ''}` : s;
            semSel.innerHTML += `<option value="${s}">${displayName}</option>`;
        });
    }
    // Tu chon hoc ky dang active
    const activeSem = semesterDBCache.find(d => d.isActive);
    if (activeSem) {
        const found = Array.from(semSel.options).find(o => o.value === activeSem.label);
        semSel.value = found ? activeSem.label : (semesters.length > 0 ? semesters[0] : 'ALL');
    } else {
        semSel.value = semesters.length > 0 ? semesters[0] : 'ALL';
    }
    onSemesterChange();
}

function onSemesterChange() {
    const semSel = document.getElementById('semesterFilter');
    const selectedSem = semSel ? semSel.value : 'ALL';
    let coursesInSem = selectedSem === 'ALL' ? allCourses : allCourses.filter(c => c.semester === selectedSem);
    computeWeeks(coursesInSem);
    renderGrid();
}

// --- Tinh danh sach tuan ---
function computeWeeks(courses) {
    const weekSel = document.getElementById('weekFilter');
    if (!weekSel) return;
    weekSel.innerHTML = '';
    weekData = [];
    if (!courses || courses.length === 0) {
        weekSel.innerHTML = '<option value="-1">Khong co du lieu</option>';
        updateWeekNav();
        return;
    }
    let minD = new Date('2099-01-01'), maxD = new Date('1970-01-01'), hasData = false;
    courses.forEach(c => {
        if (c.startDate) { let d = new Date(c.startDate); if (d < minD) minD = d; hasData = true; }
        if (c.endDate)   { let d = new Date(c.endDate);   if (d > maxD) maxD = d; hasData = true; }
    });
    if (!hasData || minD > maxD) {
        weekSel.innerHTML = '<option value="-1">Khong co du lieu</option>';
        updateWeekNav();
        return;
    }
    let day = minD.getDay();
    let startWeek = new Date(minD);
    startWeek.setDate(minD.getDate() - day + (day === 0 ? -6 : 1));
    let curWeek = new Date(startWeek), weekNum = 1;
    const now = new Date();
    let currentWeekIndex = 0;
    while (curWeek <= maxD) {
        let endW = new Date(curWeek);
        endW.setDate(endW.getDate() + 6);
        const fmt = d => d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
        weekData.push({ label:`Tuan ${weekNum} (${fmt(curWeek)} \u2013 ${fmt(endW)})`, num:weekNum, start:new Date(curWeek), end:new Date(endW) });
        if (now >= curWeek && now <= endW) currentWeekIndex = weekNum - 1;
        curWeek.setDate(curWeek.getDate() + 7);
        weekNum++;
    }
    weekData.forEach((w, i) => weekSel.innerHTML += `<option value="${i}">${w.label}</option>`);
    if (weekData.length > 0) weekSel.value = Math.min(currentWeekIndex, weekData.length - 1).toString();
    updateWeekNav();
}

// --- Render luoi TKB ---
function renderGrid() {
    const filterSem    = document.getElementById('semesterFilter')?.value || 'ALL';
    const weekSelValue = document.getElementById('weekFilter')?.value;
    const grid         = document.getElementById('tkbGrid');
    grid.innerHTML     = '';
    updateWeekNav();

    let weekStart = null;
    if (weekSelValue && weekSelValue !== '-1' && weekData.length > parseInt(weekSelValue)) {
        weekStart = weekData[parseInt(weekSelValue)].start;
    }

    const dayNames = ['', 'Thu 2', 'Thu 3', 'Thu 4', 'Thu 5', 'Thu 6', 'Thu 7', 'CN'];
    const today    = new Date();
    today.setHours(0,0,0,0);

    const cornerEl = document.createElement('div');
    cornerEl.className = 'tkb-header tkb-corner';
    cornerEl.innerHTML = `<ion-icon name="calendar-outline" style="font-size:20px;opacity:0.5;"></ion-icon>`;
    grid.appendChild(cornerEl);

    for (let col = 1; col <= 7; col++) {
        const div = document.createElement('div');
        div.className = 'tkb-header';
        let dateStr = '';
        let isToday = false;
        if (weekStart) {
            const colDate = new Date(weekStart);
            colDate.setDate(weekStart.getDate() + (col - 1));
            dateStr = colDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            colDate.setHours(0,0,0,0);
            isToday = colDate.getTime() === today.getTime();
        }
        if (isToday) {
            div.classList.add('tkb-header-today');
            div.innerHTML = `<div class="tkb-header-day">${dayNames[col]}</div><div class="tkb-header-date today-badge">${dateStr}</div><div class="today-dot"></div>`;
        } else {
            div.innerHTML = `<div class="tkb-header-day">${dayNames[col]}</div>${dateStr ? `<div class="tkb-header-date">${dateStr}</div>` : ''}`;
        }
        grid.appendChild(div);
    }

    const todayJS = new Date().getDay();
    const todayCol = todayJS === 0 ? 7 : todayJS;

    for (let i = 1; i <= 13; i++) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'tkb-time-label';
        timeDiv.style.gridRow    = `${i + 1}`;
        timeDiv.style.gridColumn = `1`;
        timeDiv.innerHTML = `<div class="lesson-num">Tiet ${i}</div><div class="lesson-time">${LESSON_TIMES[i]}</div>`;
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

    // Filter courses
    let filtered = allCourses;
    if (filterSem !== 'ALL') filtered = filtered.filter(c => c.semester === filterSem);
    if (weekSelValue && weekSelValue !== '-1' && weekData.length > parseInt(weekSelValue)) {
        const sel = weekData[parseInt(weekSelValue)];
        filtered = filtered.filter(c => {
            if (!c.startDate || !c.endDate) return false;
            let sd = new Date(c.startDate), ed = new Date(c.endDate);
            sd.setHours(0,0,0,0); ed.setHours(23,59,59,999);
            const ws = new Date(sel.start); ws.setHours(0,0,0,0);
            const we = new Date(sel.end);   we.setHours(23,59,59,999);
            return sd <= we && ed >= ws;
        });
    }

    // Render course cards
    for (let d = 2; d <= 8; d++) {
        const wrapper = document.createElement('div');
        wrapper.style.gridColumn    = `${d}`;
        wrapper.style.gridRow       = `2 / span 13`;
        wrapper.style.position      = 'relative';
        wrapper.style.pointerEvents = 'none';
        wrapper.style.overflow      = 'hidden';
        grid.appendChild(wrapper);

        const dayCourses = filtered
            .filter(c => parseInt(c.dayOfWeek) === d && c.startLesson && c.endLesson)
            .sort((a,b) => a.startLesson - b.startLesson);

        dayCourses.forEach(course => {
            const overlapping = dayCourses.filter(o => o.startLesson <= course.endLesson && o.endLesson >= course.startLesson);
            const count = Math.max(1, overlapping.length);
            const idx   = overlapping.findIndex(o => o.id === course.id);

            const card = document.createElement('div');
            card.className = 'tkb-course-card';
            card.style.pointerEvents = 'auto';
            card.style.position  = 'absolute';
            card.style.top       = `calc(${(course.startLesson - 1) / 13 * 100}% + 3px)`;
            card.style.height    = `calc(${(course.endLesson - course.startLesson + 1) / 13 * 100}% - 6px)`;
            card.style.width     = `calc(${100 / count}% - 6px)`;
            card.style.left      = `calc(${Math.max(0,idx) * (100 / count)}% + 3px)`;
            card.style.zIndex    = '5';

            const color    = CARD_COLORS[0];
            card.style.backgroundColor = color.bg;
            card.style.borderLeftColor  = color.border;

            const timeStr = `${LESSON_TIMES[course.startLesson]} \u2192 ${LESSON_END_TIMES[course.endLesson]}`;
            let teacherName = course.teacherName || localStorage.getItem('user_name') || 'N/A';

            card.innerHTML = `
                <div class="card-subject" style="color:${color.text};">${course.subjectName}</div>
                <div class="card-code" style="color:${color.border};">${course.subjectCode}</div>
                <div class="card-meta">
                    <div class="card-row"><ion-icon name="people-outline"></ion-icon><span>Nhom ${course.className || '\u2014'}</span></div>
                    <div class="card-row"><ion-icon name="business-outline"></ion-icon><span>${course.room || 'N/A'}</span></div>
                    <div class="card-row"><ion-icon name="person-outline"></ion-icon><span>${teacherName}</span></div>
                    <div class="card-row card-time"><ion-icon name="time-outline"></ion-icon><span>${timeStr}</span></div>
                </div>
            `;
            card.title  = `${course.subjectName} \u2014 Tiet ${course.startLesson}\u2192${course.endLesson}`;
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => openCourseDetailModal(course));
            wrapper.appendChild(card);
        });
    }
}

// --- Modal chi tiet ---
function openCourseDetailModal(course) {
    const modal = document.getElementById('courseDetailModal');
    if (!modal) return;
    const timeStr      = `${LESSON_TIMES[course.startLesson]} \u2013 ${LESSON_END_TIMES[course.endLesson]}`;
    const startDateStr = course.startDate ? new Date(course.startDate+'T00:00:00').toLocaleDateString('vi-VN') : 'N/A';
    const endDateStr   = course.endDate   ? new Date(course.endDate  +'T00:00:00').toLocaleDateString('vi-VN') : 'N/A';

    // Hien thi ten hoc ky day du
    const dbSem = semesterDBCache.find(d => d.label === course.semester);
    const semLabel = dbSem ? dbSem.labelFull : (course.semester || 'N/A');

    document.getElementById('cdmSubject').textContent  = `${course.subjectCode} \u2014 ${course.subjectName}`;
    document.getElementById('cdmClass').textContent    = course.className;
    document.getElementById('cdmRoom').textContent     = course.room || 'N/A';
    document.getElementById('cdmSchedule').textContent = `${DOW_LABELS[course.dayOfWeek] || ''} | Tiet ${course.startLesson}\u2192${course.endLesson} | ${timeStr}`;
    document.getElementById('cdmSemester').textContent = semLabel;
    document.getElementById('cdmPeriod').textContent   = `${startDateStr} \u2192 ${endDateStr}`;
    document.getElementById('cdmCredits').textContent  = `${course.credits || 'N/A'} tin chi`;

    document.getElementById('cdmBtnCreateSession').onclick = () => {
        localStorage.setItem('selected_course_id', course.id);
        window.location.href = 'create-session.html';
    };
    modal.style.display = 'flex';
}

function closeCourseDetailModal() {
    document.getElementById('courseDetailModal').style.display = 'none';
}
