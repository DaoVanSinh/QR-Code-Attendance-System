const auth = checkAuth('TEACHER');
if (auth) {
    document.getElementById('sidebar-placeholder').innerHTML = buildSidebar('create-session.html');
    fetchAndCacheAvatar();
    loadCourses();
}

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
const DOW_LABELS = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

let allTeacherCourses = [];   // lưu list course để tra cứu khi user chọn

async function loadCourses() {
    try {
        // Kiểm tra xem có phiên điểm danh nào đang chưa kết thúc không
        const expStr = storageGet('current_expired_at');
        if (expStr) {
            // Fix timezone issue by treating string as UTC if Z is missing
            const expiredStrUTC = expStr.endsWith('Z') ? expStr : expStr + 'Z';
            const expiredAt = new Date(expiredStrUTC).getTime();
            if (expiredAt > Date.now()) {
                const warningBox = document.getElementById('activeSessionWarning');
                if (warningBox) {
                    warningBox.style.display = 'block';
                    
                    // Thử lấy thông tin khóa học nếu có
                    const courseInfoStr = storageGet('current_course_info');
                    if (courseInfoStr) {
                        try {
                            const info = JSON.parse(courseInfoStr);
                            document.getElementById('activeSessionSubject').textContent = info.subjectName || info.subjectCode;
                            document.getElementById('activeSessionClass').textContent = info.className;
                        } catch (e) {}
                    } else {
                        // Trạng thái cũ chưa lưu courseInfoStr
                        document.getElementById('activeSessionSubject').textContent = "đang mở";
                        document.getElementById('activeSessionClass').textContent = "?";
                    }
                }
            } else {
                // Xóa dữ liệu cũ nếu đã hết hạn
                storageRemove('current_session_id');
                storageRemove('current_qr_code');
                storageRemove('current_expired_at');
                storageRemove('current_course_info');
            }
        }

        const res = await authFetch(`${API_BASE_URL}/teacher/courses`);
        if (!res.ok) { showToast('Lỗi khi tải danh sách khóa học', 'error'); return; }
        const courses = await res.json();
        allTeacherCourses = courses;
        const select = document.getElementById('courseSelect');

        if (!courses.length) {
            select.innerHTML = '<option disabled selected>Chưa có khóa học nào được giao</option>';
            document.getElementById('submitBtn').disabled = true;
            return;
        }

        select.innerHTML = '<option value="" disabled selected>-- Chọn khóa học --</option>';

        const today = new Date();
        const jsDow = today.getDay();
        const systemDow = jsDow === 0 ? 8 : jsDow + 1;
        today.setHours(0, 0, 0, 0);

        const coursesToday = [];
        const coursesOther = [];

        courses.forEach(c => {
            let isToday = false;
            // Parse c.dayOfWeek và c.dayOfWeek2 đề phòng backend trả về chuỗi hoặc null
            const courseDow1 = parseInt(c.dayOfWeek, 10);
            const courseDow2 = parseInt(c.dayOfWeek2, 10);
            
            if (courseDow1 === systemDow || courseDow2 === systemDow) {
                // Kiểm tra xem có đang trong thời gian học kỳ không
                let validDate = true;
                if (c.startDate && c.endDate) {
                    const start = new Date(c.startDate + 'T00:00:00');
                    const end = new Date(c.endDate + 'T23:59:59');
                    if (today < start || today > end) {
                        validDate = false;
                    }
                }
                if (validDate) isToday = true;
            }

            if (isToday) coursesToday.push(c);
            else coursesOther.push(c);
        });

        const createOption = (c) => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = `${c.subjectCode} - ${c.subjectName} | ${c.className} | HK ${c.semester}`;
            return opt;
        };

        // Luôn hiển thị nhóm "Hôm nay" để user biết tính năng đang hoạt động
        const groupToday = document.createElement('optgroup');
        groupToday.label = ` Hôm nay (${DOW_LABELS[systemDow]})`;
        if (coursesToday.length > 0) {
            coursesToday.forEach(c => groupToday.appendChild(createOption(c)));
        } else {
            const emptyOpt = document.createElement('option');
            emptyOpt.disabled = true;
            emptyOpt.textContent = "Không có lịch dạy hôm nay";
            groupToday.appendChild(emptyOpt);
        }
        select.appendChild(groupToday);

        if (coursesOther.length > 0) {
            const groupOther = document.createElement('optgroup');
            groupOther.label = coursesToday.length > 0 ? "Các môn học khác" : "Tất cả môn học";
            coursesOther.forEach(c => groupOther.appendChild(createOption(c)));
            select.appendChild(groupOther);
        }

        // Pre-select if coming from dashboard
        const preselectedId = storageGet('selected_course_id');
        if (preselectedId) {
            select.value = preselectedId;
            storageRemove('selected_course_id');
            select.dispatchEvent(new Event('change'));
        } else if (coursesToday.length === 1) {
            // Auto-select if there is exactly 1 course today
            select.value = coursesToday[0].id;
            select.dispatchEvent(new Event('change'));
        }
    } catch (e) {
        showToast('Lỗi mạng lưới kết nối', 'error');
    }
}

document.getElementById('courseSelect').addEventListener('change', function () {
    const courseId = parseInt(this.value);
    const course = allTeacherCourses.find(c => c.id === courseId);
    const box = document.getElementById('courseInfoBox');
    if (!course || !box) return;

    const todayStr = new Date().toLocaleDateString('vi-VN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    
    // Xử lý lịch 1
    const timeStr1 = course.startLesson
        ? `${LESSON_TIMES[course.startLesson]} – ${LESSON_END_TIMES[course.endLesson]}`
        : 'N/A';
    const schedule1 = `${DOW_LABELS[course.dayOfWeek] || 'N/A'} | Tiết ${course.startLesson || 'N/A'}→${course.endLesson || 'N/A'} (${timeStr1})`;

    // Xử lý lịch 2 (nếu có)
    let schedule2HTML = '';
    if (course.dayOfWeek2) {
        const timeStr2 = course.startLesson2
            ? `${LESSON_TIMES[course.startLesson2]} – ${LESSON_END_TIMES[course.endLesson2]}`
            : 'N/A';
        const schedule2 = `${DOW_LABELS[course.dayOfWeek2] || 'N/A'} | Tiết ${course.startLesson2 || 'N/A'}→${course.endLesson2 || 'N/A'} (${timeStr2})`;
        schedule2HTML = `<div> <strong>Lịch 2:</strong> ${schedule2}</div>`;
    }

    const startDateStr = course.startDate
        ? new Date(course.startDate + 'T00:00:00').toLocaleDateString('vi-VN')
        : 'N/A';
    const endDateStr = course.endDate
        ? new Date(course.endDate + 'T00:00:00').toLocaleDateString('vi-VN')
        : 'N/A';

    box.style.display = 'block';
    box.innerHTML = `
        <div style="background:#f0f8ff;border:1px solid #90caf9;border-radius:6px;padding:14px 16px;font-size:13px;">
            <div style="font-weight:700;font-size:14px;color:var(--primary-dark);margin-bottom:10px;border-bottom:1px solid #bbdefb;padding-bottom:8px;">
                Thông tin lớp học
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;line-height:1.8;">
                <div style="grid-column:1/-1;"> <strong>Môn học:</strong> ${course.subjectCode} — ${course.subjectName}</div>
                <div> <strong>Nhóm/Lớp:</strong> ${course.className}</div>
                <div> <strong>Phòng học:</strong> ${course.room || 'N/A'}</div>
                <div style="grid-column:1/-1;"> <strong>Lịch 1:</strong> ${schedule1}</div>
                ${schedule2HTML ? `<div style="grid-column:1/-1;">${schedule2HTML}</div>` : ''}
                <div> <strong>Học kỳ:</strong> ${course.semester}</div>
                <div style="grid-column:1/-1;font-size:11px;color:var(--text-muted);">
                     Thời hạn: ${startDateStr} → ${endDateStr}
                </div>
            </div>
            <div style="margin-top:10px;padding:10px;background:#fff3e0;border:1px solid #ffb74d;border-radius:4px;font-weight:600;color:#e65100;">
                 Ngày điểm danh hôm nay: ${todayStr}
            </div>
        </div>
    `;
});

document.getElementById('sessionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const courseId = document.getElementById('courseSelect').value;
    const durationMinutes = parseInt(document.getElementById('durationInput').value);

    if (!courseId) { showToast('Vui lòng chọn khóa học!', 'error'); return; }
    if (!durationMinutes || durationMinutes < 1) { showToast('Thời lượng không hợp lệ!', 'error'); return; }

    const btn = document.getElementById('submitBtn');
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Đang tạo...';
    btn.disabled = true;

    try {
        const res = await authFetch(`${API_BASE_URL}/teacher/courses/${courseId}/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ durationMinutes })
        });

        const data = await res.json();
        if (res.ok) {
            storageSet('current_session_id', data.id);
            storageSet('current_qr_code', data.qrCode);
            storageSet('current_expired_at', data.expiredAt);

            const selectedCourse = allTeacherCourses.find(c => c.id === parseInt(courseId));
            if (selectedCourse) {
                storageSet('current_course_info', JSON.stringify({
                    subjectName: data.subjectName || selectedCourse.subjectName,
                    subjectCode: data.subjectCode || selectedCourse.subjectCode,
                    className: data.className || selectedCourse.className,
                    semester: data.semester || selectedCourse.semester,
                    room: data.room || selectedCourse.room,
                    dayOfWeek: data.dayOfWeek || selectedCourse.dayOfWeek,
                    startLesson: data.startLesson || selectedCourse.startLesson,
                    endLesson: data.endLesson || selectedCourse.endLesson,
                    teacherName: data.teacherName || '',
                    sessionDate: new Date().toLocaleDateString('vi-VN', {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                    })
                }));
            }

            showToast('Tạo phiên điểm danh thành công!');
            setTimeout(() => window.location.href = 'display-qr.html', 900);
        } else {
            showToast(data.error || 'Lỗi khi tạo phiên điểm danh', 'error');
            btn.innerHTML = '<ion-icon name="qr-code-outline"></ion-icon> Tạo Mã QR';
            btn.disabled = false;
        }
    } catch (error) {
        showToast('Lỗi mạng lưới kết nối', 'error');
        btn.innerHTML = '<ion-icon name="qr-code-outline"></ion-icon> Tạo Mã QR';
        btn.disabled = false;
    }
});
