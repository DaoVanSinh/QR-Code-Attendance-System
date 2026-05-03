const API_BASE_URL = '/api';
const LOGIN_URL = '/common/login.html';
const ROLE_PREFIX = 'STUDENT_';

// ── Storage Helpers (namespace theo role) ─────────────────────────────
function storageGet(key)       { return localStorage.getItem(ROLE_PREFIX + key); }
function storageSet(key, val)  { localStorage.setItem(ROLE_PREFIX + key, val); }
function storageRemove(key)    { localStorage.removeItem(ROLE_PREFIX + key); }
function storageClearRole() {
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
        const redirectUrl = encodeURIComponent(window.location.href);
        window.location.href = `${LOGIN_URL}?redirect=${redirectUrl}`; 
        return null; 
    }
    if (requiredRole && role !== requiredRole) {
        alert('Bạn không có quyền truy cập trang này.');
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
    toast.innerHTML = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
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
    const studentDropdown = document.getElementById('studentProfileDropdown');
    if (studentDropdown && studentDropdown.classList.contains('show')) {
        studentDropdown.classList.remove('show');
    }
});

/**
 * Gọi /api/user/profile để lấy avatar mới nhất → lưu localStorage → cập nhật header avatar.
 * Gọi sau checkAuth() trên mọi trang student.
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

        // Cập nhật DOM — student dùng header, không phải sidebar
        const imgEl = document.getElementById('studentAvatar');
        if (imgEl && avatar && avatar.length > 10) {
            imgEl.src = avatar;
        } else if (imgEl && fullName) {
            imgEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff&size=64`;
        }

        // Cập nhật tên trên header (các trang student dùng ID khác nhau)
        const nameEls = ['headerUserName', 'studentName'];
        nameEls.forEach(id => {
            const el = document.getElementById(id);
            if (el && fullName) el.textContent = fullName;
        });
    } catch (e) {
        // Không làm gì — avatar fallback vẫn ổn
    }
}
