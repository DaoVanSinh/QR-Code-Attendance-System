const auth = checkAuth('TEACHER');
const sessionId = localStorage.getItem('current_session_id');

if (auth) {
    document.getElementById('sidebar-placeholder').innerHTML = buildSidebar('monitor.html');
}

if (!sessionId) {
    document.getElementById('attendanceTable').innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:32px;">Không có phiên điểm danh đang hoạt động. <a href="create-session.html" style="color:var(--primary);">Tạo phiên mới</a></td></tr>';
} else {
    loadAttendances();
    // Auto-refresh every 5 seconds
    setInterval(loadAttendances, 5000);
}

async function loadAttendances() {
    if (!sessionId) return;
    try {
        const res = await authFetch(`${API_BASE_URL}/teacher/sessions/${sessionId}/attendances`);
        if (!res.ok) { showToast('Lỗi tải dữ liệu', 'error'); return; }
        const data = await res.json();

        document.getElementById('statCount').textContent = data.length;

        const tbody = document.getElementById('attendanceTable');
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:32px;">Chưa có sinh viên điểm danh.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${r.studentName}</strong></td>
                <td style="color:var(--text-muted);">${r.studentEmail}</td>
                <td style="color:var(--success);">${new Date(r.checkInTime + (r.checkInTime.endsWith('Z')?'':'Z')).toLocaleTimeString('vi-VN')}</td>
            </tr>
        `).join('');
    } catch (e) {
        showToast('Lỗi mạng lưới kết nối', 'error');
    }
}
