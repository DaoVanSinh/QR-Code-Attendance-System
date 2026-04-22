const API_BASE_URL = '/api';
const LOGIN_URL = '../common/login.html';

function checkAuth(requiredRole) {
    const token = localStorage.getItem('jwt_token');
    const role  = localStorage.getItem('user_role');
    if (!token || !role) {
        window.location.href = LOGIN_URL;
        return null;
    }
    if (requiredRole && role !== requiredRole) {
        alert('Cảnh báo! Bạn không có quyền truy cập trang này.');
        localStorage.clear();
        window.location.href = LOGIN_URL;
        return null;
    }
    return { token, role, name: localStorage.getItem('user_name') };
}

function authFetch(url, options = {}) {
    const token = localStorage.getItem('jwt_token');
    const headers = { ...options.headers };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
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
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function logout() {
    localStorage.clear();
    window.location.href = LOGIN_URL;
}

/**
 * Build admin sidebar HTML.
 * @param {string} activePage - tên file hiện tại, VD: 'dashboard.html'
 */
function buildAdminSidebar(activePage) {
    const name = localStorage.getItem('user_name') || 'Admin';

    const pages = [
        { href: 'dashboard.html',      icon: 'grid-outline',        label: 'Tổng Quan' },
        { href: 'create-account.html', icon: 'person-add-outline',  label: 'Thêm Tài Khoản' },
        { href: 'courses.html',        icon: 'book-outline',         label: 'Phân Công Môn Học' },
        { href: 'timetable.html',      icon: 'calendar-outline',     label: 'Thời Khóa Biểu' },
    ];

    const navItems = pages.map(p => `
        <a href="${p.href}" class="nav-item ${activePage === p.href ? 'active' : ''}">
            <ion-icon name="${p.icon}"></ion-icon>
            <span>${p.label}</span>
        </a>`).join('');

    return `
    <aside class="sidebar">
        <div class="brand-section">
            <div class="brand-logo">Admin Panel</div>
            <div class="brand-title">QR Attendance</div>
        </div>
        <div class="user-snippet">
            <div class="user-name" id="sidebarUserName" style="font-size: 14px; margin-top: 4px;">${name}</div>
        </div>
        <nav class="nav-links">
            ${navItems}
        </nav>
        <div class="logout-container">
            <button class="btn-logout" onclick="logout()">
                <ion-icon name="log-out-outline"></ion-icon> Đăng Xuất
            </button>
        </div>
    </aside>`;
}
