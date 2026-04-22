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

function logout() { localStorage.clear(); window.location.href = LOGIN_URL; }

function buildSidebar(activePage) {
    const name = localStorage.getItem('user_name') || 'Giảng Viên';
    const pages = [
        { href: 'dashboard.html', icon: 'home-outline', label: 'Tổng Quan' },
        { href: 'create-session.html', icon: 'qr-code-outline', label: 'Tạo Phiên Điểm Danh' },
        { href: 'timetable.html', icon: 'calendar-outline', label: 'Thời Khóa Biểu' },
        { href: 'monitor.html', icon: 'people-outline', label: 'Danh Sách Điểm Danh' },
        { href: 'manual-attendance.html', icon: 'clipboard-outline', label: 'Điểm Danh Thủ Công' },
    ];

    const navItems = pages.map(p =>
        `<a href="${p.href}" class="nav-item ${activePage === p.href ? 'active' : ''}">
            <ion-icon name="${p.icon}"></ion-icon><span>${p.label}</span>
        </a>`
    ).join('');

    return `
    <aside class="sidebar">
        <div class="brand-section">
            <div class="brand-logo">🎓 QR Attendance</div>
            <div class="brand-title">Cổng Giảng Viên</div>
        </div>
        <div class="user-snippet">
            <div class="role-label">Giảng Viên</div>
            <div class="user-name" id="sidebarUserName">${name}</div>
        </div>
        <nav class="nav-links">${navItems}</nav>
        <div class="logout-container">
            <button class="btn-logout" onclick="logout()">
                <ion-icon name="log-out-outline"></ion-icon> Đăng Xuất
            </button>
        </div>
    </aside>`;
}
