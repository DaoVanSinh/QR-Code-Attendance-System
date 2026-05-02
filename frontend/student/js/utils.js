const API_BASE_URL = '/api';
const LOGIN_URL = '../common/login.html';

function checkAuth(requiredRole) {
    const token = localStorage.getItem('jwt_token');
    const role  = localStorage.getItem('user_role');
    if (!token || !role) { 
        const redirectUrl = encodeURIComponent(window.location.href);
        window.location.href = `${LOGIN_URL}?redirect=${redirectUrl}`; 
        return null; 
    }
    if (requiredRole && role !== requiredRole) {
        alert('Bạn không có quyền truy cập trang này.');
        localStorage.clear();
        window.location.href = LOGIN_URL;
        return null;
    }
    return { token, role, name: localStorage.getItem('user_name') };
}

// ── Refresh Token Helper ──────────────────────────────────────────────
let _isRefreshing = false;
let _refreshQueue = [];

async function _doRefresh() {
    const refreshToken = localStorage.getItem('refresh_token');
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
            localStorage.setItem('jwt_token', data.token);
            localStorage.setItem('refresh_token', data.refreshToken);
            if (data.user) {
                localStorage.setItem('user_role', data.user.role);
                localStorage.setItem('user_name', data.user.fullName || data.user.email);
                localStorage.setItem('user_id', data.user.id);
            }
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

async function authFetch(url, options = {}) {
    const token = localStorage.getItem('jwt_token');
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
            const newToken = localStorage.getItem('jwt_token');
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
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
}

async function logout() {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
        try {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });
        } catch (e) {}
    }
    localStorage.clear();
    window.location.href = LOGIN_URL;
}

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', function(e) {
    const studentDropdown = document.getElementById('studentProfileDropdown');
    if (studentDropdown && studentDropdown.classList.contains('show')) {
        studentDropdown.classList.remove('show');
    }
});
