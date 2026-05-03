const API_BASE_URL = '/api';
const LOGIN_URL = '/common/login.html';

// ── Detect role từ URL path ──────────────────────────────────────────
// common/js/utils.js được dùng bởi các trang trong /admin/, /teacher/, /student/
// Detect prefix tự động dựa trên URL đang truy cập
function _detectRolePrefix() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/admin/'))   return 'ADMIN_';
    if (path.includes('/teacher/')) return 'TEACHER_';
    if (path.includes('/student/')) return 'STUDENT_';
    return ''; // fallback cho /common/ pages
}
const ROLE_PREFIX = _detectRolePrefix();

// ── Storage Helpers (namespace theo role) ─────────────────────────────
function storageGet(key)       { return localStorage.getItem(ROLE_PREFIX + key); }
function storageSet(key, val)  { localStorage.setItem(ROLE_PREFIX + key, val); }
function storageRemove(key)    { localStorage.removeItem(ROLE_PREFIX + key); }
function storageClearRole() {
    if (!ROLE_PREFIX) return; // Common page — không xóa data role nào
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

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function checkAuth(requiredRole) {
    const token = storageGet('jwt_token');
    const role  = storageGet('user_role');
    if (!token || !role) {
        // Automatically save QR code from URL if present for post-login redirection
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('qr')) {
            sessionStorage.setItem('pending_qr', urlParams.get('qr'));
        }
        window.location.href = LOGIN_URL;
        return null;
    }
    if (requiredRole && role !== requiredRole) {
        alert(`Truy cập bị từ chối! Trang này yêu cầu quyền ${requiredRole}.`);
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

// ── authFetch — gọi API với auto-refresh khi 401 ─────────────────────
async function authFetch(url, options = {}) {
    const token = storageGet('jwt_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch (e) {
        // Lỗi mạng — không phải lỗi auth
        throw e;
    }

    // Nếu 401 → thử refresh token một lần
    if (response.status === 401) {
        if (_isRefreshing) {
            // Chờ refresh đang chạy xong rồi retry
            await new Promise(resolve => _refreshQueue.push(resolve));
            return authFetch(url, options);
        }

        _isRefreshing = true;
        const refreshed = await _doRefresh();
        _isRefreshing = false;
        _refreshQueue.forEach(r => r());
        _refreshQueue = [];

        if (refreshed) {
            // Retry với token mới
            const newToken = storageGet('jwt_token');
            const retryHeaders = { 'Content-Type': 'application/json', ...options.headers };
            if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;
            return fetch(url, { ...options, headers: retryHeaders });
        } else {
            // Refresh thất bại → logout thật sự
            showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
            setTimeout(() => {
                logout();
            }, 1500);
            return response;
        }
    }

    return response;
}

async function logout() {
    const refreshToken = storageGet('refresh_token');
    // Gọi API backend thu hồi refresh token
    if (refreshToken) {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
        } catch (e) {
            // Bỏ qua lỗi mạng khi logout
        }
    }
    storageClearRole();
    window.location.href = LOGIN_URL;
}
