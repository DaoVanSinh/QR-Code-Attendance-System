const API_BASE_URL = '/api';
const LOGIN_URL = '../common/login.html';

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
    const token = localStorage.getItem('jwt_token');
    const role = localStorage.getItem('user_role');
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
        localStorage.clear();
        window.location.href = LOGIN_URL;
        return null;
    }
    return { token, role, name: localStorage.getItem('user_name') };
}

async function authFetch(url, options = {}) {
    const token = localStorage.getItem('jwt_token');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(url, { ...options, headers });
    } catch (e) {
        // Lỗi mạng (network error) - không phải lỗi auth, không cần logout
        throw e;
    }

    // Nếu backend trả 401 hoặc 403 → token hết hạn hoặc không hợp lệ → tự động logout
    if (response.status === 401 || response.status === 403) {
        const cloned = response.clone();
        // Thử đọc body để kiểm tra - nếu là lỗi auth thật sự thì logout
        // Chỉ logout nếu KHÔNG có token hợp lệ (tránh logout khi bị denied vì thiếu quyền role)
        const storedToken = localStorage.getItem('jwt_token');
        if (!storedToken) {
            // Không có token → redirect thẳng
            window.location.href = LOGIN_URL;
            return cloned;
        }

        // Kiểm tra token có bị hết hạn không bằng cách decode phần payload
        try {
            const payloadBase64 = storedToken.split('.')[1];
            const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
            const isExpired = payload.exp && (payload.exp * 1000 < Date.now());
            if (isExpired) {
                showToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'error');
                setTimeout(() => {
                    localStorage.clear();
                    window.location.href = LOGIN_URL;
                }, 1500);
            }
        } catch (e) {
            // Không decode được token → token lỗi → logout
            localStorage.clear();
            window.location.href = LOGIN_URL;
        }
        return cloned;
    }

    return response;
}

function logout() {
    localStorage.clear();
    window.location.href = LOGIN_URL;
}
