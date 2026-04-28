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

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', function(e) {
    const adminDropdown = document.getElementById('adminProfileDropdown');
    if (adminDropdown && adminDropdown.classList.contains('show')) {
        adminDropdown.classList.remove('show');
    }
});

function buildAdminSidebar(activePage) {
    const name = localStorage.getItem('user_name') || 'Admin';

    const pages = [
        { href: 'dashboard.html',      icon: 'grid-outline',        label: 'Tổng Quan' },
        { href: 'create-account.html', icon: 'person-add-outline',  label: 'Thêm Tài Khoản' },
        { href: 'courses.html',        icon: 'book-outline',         label: 'Phân Công Môn Học' },
        { href: 'timetable.html',      icon: 'calendar-outline',     label: 'Thời Khóa Biểu' }
    ];

    const navItems = pages.map(p => `
        <a href="${p.href}" class="nav-item ${activePage === p.href ? 'active' : ''}">
            <ion-icon name="${p.icon}"></ion-icon>
            <span>${p.label}</span>
        </a>`).join('');

    return `
    <aside class="sidebar">
        <div class="brand-header">
            <div class="logo-icon"><ion-icon name="shield-checkmark-outline"></ion-icon></div>
            <div class="brand-text">Admin Panel</div>
        </div>

        <div class="user-profile-card" onclick="event.stopPropagation(); document.getElementById('adminProfileDropdown').classList.toggle('show')">
            <img src="../admin/css/default-avatar.png" onerror="this.src='https://ui-avatars.com/api/?name='+encodeURIComponent('${name}')+'&background=random'" alt="Avatar" class="avatar">
            <div class="info">
                <div class="name">${name}</div>
                <div class="role">Super Administrator</div>
            </div>
            <ion-icon name="chevron-down-outline" style="color:var(--text-muted);"></ion-icon>
            
            <div class="profile-dropdown" id="adminProfileDropdown" onclick="event.stopPropagation()">
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
