const API_BASE_URL = '/api';
const LOGIN_URL = '/common/login.html';
const ROLE_PREFIX = 'ADMIN_';

// ── Storage Helpers (namespace theo role) ─────────────────────────────
function storageGet(key)       { return localStorage.getItem(ROLE_PREFIX + key); }
function storageSet(key, val)  { localStorage.setItem(ROLE_PREFIX + key, val); }
function storageRemove(key)    { localStorage.removeItem(ROLE_PREFIX + key); }
function storageClearRole() {
    // Chỉ xóa key có prefix của role này, không ảnh hưởng role khác
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(ROLE_PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
}

// ── Migration: xóa old keys không prefix (v1 → v3) ──────────────────
(function migrateOldKeys() {
    if (localStorage.getItem('migrated_v3')) return;
    ['jwt_token','refresh_token','user_role','user_name','user_id','user_avatar'].forEach(k => localStorage.removeItem(k));
    localStorage.setItem('migrated_v3', '1');
})();

function checkAuth(requiredRole) {
    const token = storageGet('jwt_token');
    const role  = storageGet('user_role');
    if (!token || !role) {
        window.location.href = LOGIN_URL;
        return null;
    }
    if (requiredRole && role !== requiredRole) {
        alert('Cảnh báo! Bạn không có quyền truy cập trang này.');
        storageClearRole();
        window.location.href = LOGIN_URL;
        return null;
    }
    return { token, role, name: storageGet('user_name') };
}

// ── Refresh Token Helper ──────────────────────────────────────────────
let _isRefreshing = false;
let _refreshQueue = [];

async function _doRefresh() {
    const refreshToken = storageGet('refresh_token');
    if (!refreshToken) return false;
    try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        if (!res.ok) return false;
        const data = await res.json();
        if (data.token && data.refreshToken) {
            storageSet('jwt_token', data.token);
            storageSet('refresh_token', data.refreshToken);
            if (data.user) {
                storageSet('user_role', data.user.role);
                storageSet('user_name', data.user.fullName || data.user.email);
                storageSet('user_id', data.user.id);
            }
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

async function authFetch(url, options = {}) {
    const token = storageGet('jwt_token');
    const headers = { ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch (e) {
        throw e;
    }

    if (response.status === 401) {
        if (_isRefreshing) {
            await new Promise(resolve => _refreshQueue.push(resolve));
            return authFetch(url, options);
        }
        _isRefreshing = true;
        const refreshed = await _doRefresh();
        _isRefreshing = false;
        _refreshQueue.forEach(r => r());
        _refreshQueue = [];

        if (refreshed) {
            const newToken = storageGet('jwt_token');
            const retryHeaders = { ...options.headers };
            if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;
            return fetch(url, { ...options, headers: retryHeaders });
        } else {
            showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            setTimeout(() => logout(), 1500);
            return response;
        }
    }

    return response;
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

async function logout() {
    const refreshToken = storageGet('refresh_token');
    if (refreshToken) {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
        } catch (e) {}
    }
    storageClearRole();
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
    const name = storageGet('user_name') || 'Admin';
    const cachedAvatar = storageGet('user_avatar');
    // Dùng cached avatar nếu có, ngược lại fallback về ui-avatars
    const avatarSrc = (cachedAvatar && cachedAvatar.length > 10)
        ? cachedAvatar
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=64`;

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
            <img id="sidebarAvatar" src="${avatarSrc}" alt="Avatar" class="avatar">
            <div class="info">
                <div class="name" id="sidebarUserName">${name}</div>
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

/**
 * Gọi /api/user/profile để lấy avatar mới nhất → lưu localStorage → cập nhật img#sidebarAvatar.
 * Gọi sau buildAdminSidebar() trên mọi trang admin.
 */
async function fetchAndCacheAvatar() {
    try {
        const res = await authFetch(`${API_BASE_URL}/user/profile`);
        if (!res.ok) return;
        const data = await res.json();

        const avatar   = data.avatar   || data.profilePicture || '';
        const fullName = data.fullName || data.name || '';

        // Cập nhật cache
        if (avatar)   storageSet('user_avatar', avatar);
        if (fullName) storageSet('user_name',   fullName);

        // Cập nhật DOM không cần reload trang
        const imgEl  = document.getElementById('sidebarAvatar');
        const nameEl = document.getElementById('sidebarUserName');
        if (imgEl && avatar && avatar.length > 10) imgEl.src = avatar;
        if (nameEl && fullName)                    nameEl.textContent = fullName;
    } catch (e) {
        // Không làm gì — avatar fallback về initials vẫn ổn
    }
}
