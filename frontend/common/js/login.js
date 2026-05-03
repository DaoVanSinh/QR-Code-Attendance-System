// ── Helper: lưu/đọc localStorage theo prefix role ──────────────
function _loginRolePrefix(role) { return role.toUpperCase() + '_'; }
function _loginStorageSet(role, key, val) { localStorage.setItem(_loginRolePrefix(role) + key, val); }
function _loginStorageRemove(role, key) { localStorage.removeItem(_loginRolePrefix(role) + key); }

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const identifier = document.getElementById('identifier')?.value?.trim()
                    || document.getElementById('email')?.value?.trim()
                    || '';
    const password = document.getElementById('password').value;
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    const submitBtn = document.getElementById('loginBtn');

    // Cập nhật giao diện khi loading
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Gửi field "identifier" — backend AuthService xử lý cả email lẫn mã SV/GV
            body: JSON.stringify({ identifier, password })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Đăng nhập thành công!', 'success');
            
            const role = data.user.role; // ADMIN, TEACHER, STUDENT
            // Lưu thông tin với prefix role → mỗi role có namespace riêng
            _loginStorageSet(role, 'jwt_token',     data.token);
            _loginStorageSet(role, 'refresh_token', data.refreshToken || '');
            _loginStorageSet(role, 'user_role',     role);
            _loginStorageSet(role, 'user_name',     data.user.fullName || data.user.email);
            _loginStorageSet(role, 'user_id',       data.user.id);
            if (data.user.avatar) {
                _loginStorageSet(role, 'user_avatar', data.user.avatar);
            } else {
                _loginStorageRemove(role, 'user_avatar');
            }

            setTimeout(() => {
                // Điều hướng dựa trên vai trò
                if (role === 'STUDENT') {
                    const pendingQr = sessionStorage.getItem('pending_qr');
                    if (pendingQr) {
                        sessionStorage.removeItem('pending_qr');
                        window.location.href = '/student/attendance.html?qr=' + pendingQr;
                    } else {
                        window.location.href = '/student/attendance.html';
                    }
                } else if (role === 'ADMIN') {
                    window.location.href = '/admin/dashboard.html';
                } else if (role === 'TEACHER') {
                    window.location.href = '/teacher/create-session.html';
                }
            }, 1000);
        } else {
            showToast(data.error || 'Email/mã tài khoản hoặc mật khẩu không đúng.', 'error');
        }
    } catch (error) {
        showToast('Lỗi kết nối mạng. Vui lòng thử lại.', 'error');
    } finally {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        submitBtn.disabled = false;
    }
});
