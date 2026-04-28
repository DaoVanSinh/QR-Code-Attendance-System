const API_BASE_URL = '/api';
const LOGIN_URL = '../common/login.html';

function checkAuth(requiredRole) {
    const token = localStorage.getItem('jwt_token');
    const role = localStorage.getItem('user_role');
    if (!token || !role) { window.location.href = LOGIN_URL; return null; }
    if (requiredRole && role !== requiredRole) {
        alert('Bạn không có quyền truy cập trang này.');
        localStorage.clear();
        window.location.href = LOGIN_URL;
        return null;
    }
    return { token, role, name: localStorage.getItem('user_name') };
}

function authFetch(url, options = {}) {
    const token = localStorage.getItem('jwt_token');
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, { ...options, headers });
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
}

function logout() {
    localStorage.clear();
    window.location.href = LOGIN_URL;
}

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', function(e) {
    const teacherDropdown = document.getElementById('teacherProfileDropdown');
    if (teacherDropdown && teacherDropdown.classList.contains('show')) {
        teacherDropdown.classList.remove('show');
    }
});

function buildSidebar(activePage) {
    const name = localStorage.getItem('user_name') || 'Giảng Viên';
    const pages = [
        { href: 'dashboard.html', icon: 'home-outline', label: 'Tổng Quan' },
        { href: 'create-session.html', icon: 'qr-code-outline', label: 'Tạo Phiên Điểm Danh' },
        { href: 'timetable.html', icon: 'calendar-outline', label: 'Thời Khóa Biểu' },
        { href: 'monitor.html', icon: 'people-outline', label: 'Danh Sách Điểm Danh' },
        { href: 'manual-attendance.html', icon: 'clipboard-outline', label: 'Điểm Danh Thủ Công' }
    ];

    const navItems = pages.map(p =>
        `<a href="${p.href}" class="nav-item ${activePage === p.href ? 'active' : ''}">
            <ion-icon name="${p.icon}"></ion-icon><span>${p.label}</span>
        </a>`
    ).join('');

    return `
    <aside class="sidebar">
        <div class="brand-header">
            <div class="logo-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);"><ion-icon name="school-outline"></ion-icon></div>
            <div class="brand-text">Cổng Giảng Viên</div>
        </div>

        <div class="user-profile-card" onclick="event.stopPropagation(); document.getElementById('teacherProfileDropdown').classList.toggle('show')">
            <img src="../teacher/css/default-avatar.png" onerror="this.src='https://ui-avatars.com/api/?name='+encodeURIComponent('${name}')+'&background=random'" alt="Avatar" class="avatar">
            <div class="info">
                <div class="name">${name}</div>
                <div class="role">Giảng Viên</div>
            </div>
            <ion-icon name="chevron-down-outline" style="color:var(--text-muted);"></ion-icon>
            
            <div class="profile-dropdown" id="teacherProfileDropdown" onclick="event.stopPropagation()">
                <a href="profile.html"><ion-icon name="person-outline"></ion-icon> Thông tin cá nhân</a>
                <a href="change-password.html"><ion-icon name="key-outline"></ion-icon> Đổi mật khẩu</a>
                <button class="text-danger" onclick="logout()"><ion-icon name="log-out-outline"></ion-icon> Đăng xuất</button>
            </div>
        </div>

        <nav class="nav-links">
            ${navItems}
        </nav>
    </aside>`;
}
