const auth = checkAuth('STUDENT');
let allCourses = [];
let currentTab = 'all';

if (auth) {
    document.getElementById('headerUserName').textContent = auth.name || 'Sinh Viên';
    // Load avatar từ cache trước
    const cachedAvatar = localStorage.getItem('user_avatar');
    const avatarEl = document.getElementById('studentAvatar');
    if (cachedAvatar && cachedAvatar.length > 10 && avatarEl) {
        avatarEl.src = cachedAvatar;
    }
    // Fetch mới nhất từ server
    fetchAndCacheAvatar();
    loadCourses();
}

async function loadCourses() {
    try {
        const res = await authFetch(`${API_BASE_URL}/student/courses`);
        if (!res.ok) throw new Error('Lỗi tải danh sách môn học');
        allCourses = await res.json();

        // Populate semester filter
        const semesters = [...new Set(allCourses.map(c => c.semester).filter(Boolean))].sort();
        const sel = document.getElementById('semesterFilter');
        sel.innerHTML = '<option value="ALL">Tất cả học kỳ</option>' +
            semesters.map(s => `<option value="${s}">${s}</option>`).join('');

        updateSummary();
        renderCourses();
    } catch (e) {
        document.getElementById('courseList').innerHTML =
            `<p style="color:var(--danger);text-align:center;padding:24px;">${e.message}</p>`;
    }
}

function updateSummary() {
    document.getElementById('totalCount').textContent = allCourses.length;
    document.getElementById('enrolledCount').textContent = allCourses.filter(c => c.enrolled).length;
}

function setTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.filter-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add('active');
    renderCourses();
}

function renderCourses() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const semester = document.getElementById('semesterFilter').value;

    let filtered = allCourses.filter(c => {
        const matchSearch = !search ||
            c.subjectName.toLowerCase().includes(search) ||
            c.subjectCode.toLowerCase().includes(search) ||
            (c.teacherName || '').toLowerCase().includes(search) ||
            c.className.toLowerCase().includes(search);
        const matchSemester = semester === 'ALL' || c.semester === semester;
        const matchTab = currentTab === 'all' ||
            (currentTab === 'enrolled' && c.enrolled) ||
            (currentTab === 'available' && !c.enrolled);
        return matchSearch && matchSemester && matchTab;
    });

    const list = document.getElementById('courseList');
    if (!filtered.length) {
        list.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--text-muted);">
                <ion-icon name="search-outline" style="font-size:40px;opacity:0.4;"></ion-icon>
                <p style="margin-top:10px;">Không tìm thấy môn học nào.</p>
            </div>`;
        return;
    }

    list.innerHTML = filtered.map(c => {
        const isFull = c.maxSlots && c.currentSlots >= c.maxSlots;
        const isClosed = c.regStatus === 'CLOSED';
        const slotsLabel = c.maxSlots ? `${c.currentSlots || 0}/${c.maxSlots}` : '';
        const slotsColor = isFull ? '#ef4444' : (c.currentSlots >= (c.maxSlots * 0.8) ? '#f59e0b' : '#10b981');
        const canEnroll = !c.enrolled && !isFull && !isClosed;

        return `
        <div class="course-card ${c.enrolled ? 'enrolled' : ''}" id="card-${c.courseId}" data-course-id="${c.courseId}">
            <div class="course-info">
                <span class="course-code">${escHtml(c.subjectCode)}</span>
                ${isClosed ? '<span style="display:inline-block;background:rgba(239,68,68,0.15);color:#ef4444;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:6px;">ĐÃ ĐÓNG</span>' : ''}
                <div class="course-name">${escHtml(c.subjectName)}</div>
                <div class="course-meta">
                    <span><ion-icon name="business-outline"></ion-icon> ${escHtml(c.className)}</span>
                    <span><ion-icon name="person-outline"></ion-icon> ${escHtml(c.teacherName || '—')}</span>
                    <span><ion-icon name="school-outline"></ion-icon> ${escHtml(c.semester)}</span>
                    ${c.credits ? `<span><ion-icon name="star-outline"></ion-icon> ${c.credits} TC</span>` : ''}
                    ${slotsLabel ? `<span style="color:${slotsColor};font-weight:700;"><ion-icon name="people-outline"></ion-icon> ${slotsLabel} chỗ</span>` : ''}
                </div>
                ${c.enrolled ? '<div class="badge-enrolled"><ion-icon name="checkmark-circle-outline"></ion-icon> Đã đăng ký</div>' : ''}
            </div>
            <button 
                id="btn-${c.courseId}"
                class="btn-enroll ${c.enrolled ? 'unenroll' : 'enroll'}"
                onclick="${c.enrolled ? `unenroll(${c.courseId})` : `enroll(${c.courseId})`}"
                ${!canEnroll && !c.enrolled ? 'disabled' : ''}
            >
                ${c.enrolled ? '<ion-icon name="close-outline"></ion-icon> Hủy' : (isFull ? '<ion-icon name="alert-outline"></ion-icon> Hết chỗ' : '<ion-icon name="add-outline"></ion-icon> Đăng ký')}
            </button>
        </div>
    `}).join('');
}

async function enroll(courseId) {
    const btn = document.getElementById(`btn-${courseId}`);
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="sync-outline"></ion-icon>';

    try {
        const res = await authFetch(`${API_BASE_URL}/student/courses/${courseId}/enroll`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            // Update local state
            const course = allCourses.find(c => c.courseId === courseId);
            if (course) course.enrolled = true;
            showToast('✅ Đăng ký học phần thành công! Lịch học đã được cập nhật vào <a href="timetable.html" style="color:white;text-decoration:underline;font-weight:700;">Thời Khóa Biểu →</a>', 'success');
            updateSummary();
            
            // Tìm course trong danh sách
            const courseCard = document.querySelector(`[data-course-id="${courseId}"]`);
            if (courseCard) {
                // Đổi nút Đăng ký → Hủy đăng ký
                const enrollBtn = courseCard.querySelector('.btn-enroll');
                if (enrollBtn) {
                    enrollBtn.innerHTML = '<ion-icon name="close-outline"></ion-icon> Hủy Đăng Ký';
                    enrollBtn.className = 'btn-enroll unenroll';
                    enrollBtn.onclick   = () => unenroll(courseId);
                }
                // Thêm badge "Đã đăng ký"
                const existingBadge = courseCard.querySelector('.enrolled-badge') || courseCard.querySelector('.badge-enrolled');
                if (!existingBadge) {
                    const badge = document.createElement('span');
                    badge.className = 'enrolled-badge';
                    badge.style.cssText = 'background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;display:inline-block;margin-bottom:6px;';
                    badge.textContent = '✓ Đã đăng ký';
                    courseCard.querySelector('.course-info').prepend(badge);
                }
                courseCard.classList.add('enrolled');
            }
        } else {
            showToast(data.error || 'Đăng ký thất bại.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Đăng ký';
        }
    } catch {
        showToast('Lỗi kết nối mạng.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Đăng ký';
    }
}

async function unenroll(courseId) {
    if (!confirm('Bạn có chắc muốn hủy đăng ký học phần này không?')) return;
    const btn = document.getElementById(`btn-${courseId}`);
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="sync-outline"></ion-icon>';

    try {
        const res = await authFetch(`${API_BASE_URL}/student/courses/${courseId}/unenroll`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            const course = allCourses.find(c => c.courseId === courseId);
            if (course) course.enrolled = false;
            showToast('Đã hủy đăng ký học phần. <a href="timetable.html" style="color:white;text-decoration:underline;">Xem lại TKB →</a>', 'success');
            updateSummary();
            
            const courseCard = document.querySelector(`[data-course-id="${courseId}"]`);
            if (courseCard) {
                const enrollBtn = courseCard.querySelector('.btn-enroll');
                if (enrollBtn) {
                    enrollBtn.innerHTML = '<ion-icon name="add-outline"></ion-icon> Đăng ký';
                    enrollBtn.className = 'btn-enroll enroll';
                    enrollBtn.onclick   = () => enroll(courseId);
                }
                
                const badge1 = courseCard.querySelector('.enrolled-badge');
                if (badge1) badge1.remove();
                
                const badge2 = courseCard.querySelector('.badge-enrolled');
                if (badge2) badge2.remove();

                courseCard.classList.remove('enrolled');
            }
        } else {
            showToast(data.error || 'Hủy đăng ký thất bại.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<ion-icon name="close-outline"></ion-icon> Hủy';
        }
    } catch {
        showToast('Lỗi kết nối mạng.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<ion-icon name="close-outline"></ion-icon> Hủy';
    }
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
