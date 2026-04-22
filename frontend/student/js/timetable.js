// ============================================================
//  TIMETABLE.JS — Student View v9
//  Features: Week navigation, semester filter from DB,
//            color-coded cards, course detail modal
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
        const w   = weekData[cur];
        const fmt = d => d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
        document.getElementById('weekLabel').textContent = `Tuan ${w.num}  \u00b7  ${fmt(w.start)} \u2013 ${fmt(w.end)}`;
    }
}

async function loadTimetable() {
    document.getElementById('loadingMsg').style.display = 'block';
    document.getElementById('timetableWrapper').style.display = 'none';
    try {
        const [courseRes, semRes] = await Promise.all([
            authFetch(`${API_BASE_URL}/student/courses`),
            authFetch(`${API_BASE_URL}/student/semesters`)
        ]);
        if (!courseRes.ok) throw new Error('Khong the tai du lieu thoi khoa bieu');
        const data = await courseRes.json();
        allCourses = data.filter(c => c.enrolled === true);
        if (semRes.ok) semesterDBCache = await semRes.json();
        populateSemesterFilter();
        renderGrid();
    } catch (error) {
        console.error('[Student TKB] Error:', error);
        showToast(error.message, 'error');
    } finally {
        document.getElementById('loadingMsg').style.display = 'none';
        document.getElementById('timetableWrapper').style.display = 'block';
    }
}

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
    const sel    = semSel ? semSel.value : 'ALL';
    const list   = sel === 'ALL' ? allCourses : allCourses.filter(c => c.semester === sel);
    computeWeeks(list);
    renderGrid();
}

function computeWeeks(courses) {
    const weekSel = document.getElementById('weekFilter');
    if (!weekSel) return;
    weekSel.innerHTML = '';
    weekData = [];
    if (!courses || courses.length === 0) {
        weekSel.innerHTML = '<option value="-1">Khong co du lieu</option>';
        updateWeekNav(); return;
    }
    let minD = new Date('2099-01-01'), maxD = new Date('1970-01-01'), hasData = false;
    courses.forEach(c => {
        if (c.startDate) { const d = new Date(c.startDate); if (d < minD) minD = d; hasData = true; }
        if (c.endDate)   { const d = new Date(c.endDate);   if (d > maxD) maxD = d; hasData = true; }
    });
    if (!hasData || minD > maxD) {
        weekSel.innerHTML = '<option value="-1">Khong co du lieu</option>';
        updateWeekNav(); return;
    }
    let day = minD.getDay();
    const startWeek = new Date(minD);
    startWeek.setDate(minD.getDate() - day + (day === 0 ? -6 : 1));
    let curWeek = new Date(startWeek), weekNum = 1, currentWeekIndex = 0;
    const now = new Date();
    while (curWeek <= maxD) {
        const endW = new Date(curWeek);
        endW.setDate(endW.getDate() + 6);
        const fmt = d => d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
        weekData.push({ label:`Tuan ${weekNum} (${fmt(curWeek)} \u2013 ${fmt(endW)})`, num:weekNum, start:new Date(curWeek), end:new Date(endW) });
        if (now >= curWeek && now <= endW) currentWeekIndex = weekNum - 1;
        curWeek.setDate(curWeek.getDate() + 7);
        weekNum++;
    }
    weekData.forEach((w,i) => weekSel.innerHTML += `<option value="${i}">${w.label}</option>`);
    if (weekData.length > 0) weekSel.value = Math.min(currentWeekIndex, weekData.length - 1).toString();
    updateWeekNav();
}

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

    const dayNames = ['','Thu 2','Thu 3','Thu 4','Thu 5','Thu 6','Thu 7','CN'];
    const today = new Date(); today.setHours(0,0,0,0);

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
            dateStr = colDate.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
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

    const todayJS  = new Date().getDay();
    const todayCol = todayJS === 0 ? 7 : todayJS;

    for (let i = 1; i <= 13; i++) {
        const timeDiv = document.createElement('div');
        timeDiv.className = 'tkb-time-label';
        timeDiv.style.gridRow = `${i+1}`; timeDiv.style.gridColumn = '1';
        timeDiv.innerHTML = `<div class="lesson-num">Tiet ${i}</div><div class="lesson-time">${LESSON_TIMES[i]}</div>`;
        grid.appendChild(timeDiv);
        for (let d = 2; d <= 8; d++) {
            const empty = document.createElement('div');
            empty.className = 'tkb-cell-empty' + ((d-1) === todayCol ? ' tkb-cell-today' : '');
            empty.style.gridRow = `${i+1}`; empty.style.gridColumn = `${d}`;
            grid.appendChild(empty);
        }
    }

    let filtered = allCourses;
    if (filterSem !== 'ALL') filtered = filtered.filter(c => c.semester === filterSem);
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

    for (let d = 2; d <= 8; d++) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `grid-column:${d};grid-row:2/span 13;position:relative;pointer-events:none;overflow:hidden;`;
        grid.appendChild(wrapper);

        const dayCourses = filtered
            .filter(c => parseInt(c.dayOfWeek) === d && c.startLesson && c.endLesson)
            .sort((a,b) => a.startLesson - b.startLesson);

        dayCourses.forEach(course => {
            const overlapping = dayCourses.filter(o => o.startLesson <= course.endLesson && o.endLesson >= course.startLesson);
            const count = Math.max(1, overlapping.length);
            const idx   = overlapping.findIndex(o => o.subjectCode === course.subjectCode && o.className === course.className);

            const card = document.createElement('div');
            card.className = 'tkb-course-card';
            card.style.cssText = `
                pointer-events:auto;position:absolute;
                top:calc(${(course.startLesson-1)/13*100}% + 3px);
                height:calc(${(course.endLesson-course.startLesson+1)/13*100}% - 6px);
                width:calc(${100/count}% - 6px);
                left:calc(${Math.max(0,idx)*(100/count)}% + 3px);
                z-index:5;
            `;
            const color    = CARD_COLORS[0]; 
            card.style.backgroundColor = color.bg;
            card.style.borderLeftColor  = color.border;

            const timeStr     = `${LESSON_TIMES[course.startLesson]} \u2192 ${LESSON_END_TIMES[course.endLesson]}`;
            const teacherName = course.teacherName || 'N/A';

            card.innerHTML = `
                <div class="card-subject" style="color:${color.text};">${course.subjectName}</div>
                <div class="card-code"    style="color:${color.border};">${course.subjectCode}</div>
                <div class="card-meta">
                    <div class="card-row" style="color:${color.text};"><ion-icon name="people-outline"></ion-icon><span>Nhom ${course.className||'\u2014'}</span></div>
                    <div class="card-row" style="color:${color.text};"><ion-icon name="business-outline"></ion-icon><span>${course.room||'N/A'}</span></div>
                    <div class="card-row" style="color:${color.text};"><ion-icon name="person-outline"></ion-icon><span>${teacherName}</span></div>
                    <div class="card-row card-time" style="color:${color.text};"><ion-icon name="time-outline"></ion-icon><span>${timeStr}</span></div>
                </div>
            `;
            card.title = `${course.subjectName} \u2014 Tiet ${course.startLesson}\u2192${course.endLesson}`;
            card.addEventListener('click', () => openStudentCourseModal(course));
            wrapper.appendChild(card);
        });
    }
}

function openStudentCourseModal(course) {
    const modal = document.getElementById('studentCourseModal');
    if (!modal) return;
    const timeStr      = `${LESSON_TIMES[course.startLesson]} \u2013 ${LESSON_END_TIMES[course.endLesson]}`;
    const startDateStr = course.startDate ? new Date(course.startDate+'T00:00:00').toLocaleDateString('vi-VN') : 'N/A';
    const endDateStr   = course.endDate   ? new Date(course.endDate+'T00:00:00').toLocaleDateString('vi-VN')   : 'N/A';

    // Hien thi ten hoc ky day du
    const dbSem = semesterDBCache.find(d => d.label === course.semester);
    const semLabel = dbSem ? dbSem.labelFull : (course.semester || 'N/A');

    document.getElementById('scmSubject').textContent  = `${course.subjectCode} \u2014 ${course.subjectName}`;
    document.getElementById('scmClass').textContent    = course.className;
    document.getElementById('scmTeacher').textContent  = course.teacherName || 'N/A';
    document.getElementById('scmRoom').textContent     = course.room || 'N/A';
    document.getElementById('scmSchedule').textContent = `${DOW_LABELS[course.dayOfWeek]||''} | Tiet ${course.startLesson}\u2192${course.endLesson}`;
    document.getElementById('scmTime').textContent     = timeStr;
    document.getElementById('scmSemester').textContent = semLabel;
    document.getElementById('scmPeriod').textContent   = `${startDateStr} \u2192 ${endDateStr}`;
    document.getElementById('scmCredits').textContent  = `${course.credits||'N/A'} tin chi`;
    modal.style.display = 'flex';
}

function closeStudentCourseModal() {
    document.getElementById('studentCourseModal').style.display = 'none';
}
