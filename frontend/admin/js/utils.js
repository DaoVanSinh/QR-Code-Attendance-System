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
        { href: '../common/profile.html', icon: 'person-outline', label: 'Hồ Sơ Cá Nhân' },
        { href: '../common/change-password.html', icon: 'key-outline', label: 'Đổi Mật Khẩu' }
    ];

    const navItems = pages.map(p => `
        <a href="${p.href}" class="nav-item ${activePage === p.href ? 'active' : ''}">
            <ion-icon name="${p.icon}"></ion-icon>
            <span>${p.label}</span>
        </a>`).join('');

    return `
    <aside class="sidebar">
        <div class="user-profile-card" onclick="document.getElementById('adminProfileDropdown').classList.toggle('show')">
            <img src="../admin/css/default-avatar.png" onerror="this.src='https://ui-avatars.com/api/?name='+encodeURIComponent('${name}')+'&background=random'" alt="Avatar" class="avatar">
            <div class="info">
                <div class="name">${name}</div>
                <div class="role">Administrator</div>
            </div>
            <ion-icon name="chevron-down-outline" class="caret"></ion-icon>
            
            <div class="profile-dropdown" id="adminProfileDropdown" onclick="event.stopPropagation()">
                <a href="../common/profile.html"><ion-icon name="person-outline"></ion-icon> Thông tin cá nhân</a>
                <a href="../common/change-password.html"><ion-icon name="key-outline"></ion-icon> Đổi mật khẩu</a>
                <button class="text-danger" onclick="logout()"><ion-icon name="log-out-outline"></ion-icon> Đăng xuất</button>
            </div>
        </div>
        
        <nav class="nav-links" style="margin-top: 10px;">
            ${navItems}
        </nav>
        <div class="brand-bottom">
            QR Attendance System
        </div>
    </aside>`;
}
