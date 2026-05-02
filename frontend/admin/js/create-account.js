// Auth & sidebar init handled by inline script in create-account.html

// Toggle fields based on role selection
document.getElementById('role').addEventListener('change', function() {
    const isStudent = this.value === 'STUDENT';
    const studentIdGroup  = document.getElementById('studentIdGroup');
    const departmentGroup = document.getElementById('departmentGroup');
    const classNameGroup  = document.getElementById('classNameGroup');
    const usernameInput   = document.getElementById('username');

    if (isStudent) {
        studentIdGroup.style.display  = 'block';
        departmentGroup.style.display = 'block';
        classNameGroup.style.display  = 'block';
        usernameInput.setAttribute('required', 'required');
    } else {
        studentIdGroup.style.display  = 'none';
        departmentGroup.style.display = 'none';
        classNameGroup.style.display  = 'none';
        usernameInput.removeAttribute('required');
        usernameInput.value = '';
        document.getElementById('department').value = '';
        document.getElementById('className').value  = '';
    }
});

document.getElementById('createAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName    = document.getElementById('fullName').value.trim();
    const email       = document.getElementById('email').value.trim();
    const password    = document.getElementById('password').value;
    const role        = document.getElementById('role').value;
    const username   = document.getElementById('username').value.trim();
    const department = document.getElementById('department')?.value.trim()  || '';
    const className  = document.getElementById('className')?.value.trim()   || '';

    if (!role) {
        showToast('Vui lòng chọn vai trò cho tài khoản!', 'error');
        return;
    }

    if (role === 'STUDENT' && !username) {
        showToast('Vui lòng nhập mã sinh viên (dùng để đăng nhập)!', 'error');
        return;
    }

    // Show loading state
    const btnText    = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const submitBtn  = document.getElementById('submitBtn');
    btnText.style.display   = 'none';
    btnSpinner.style.display = 'inline-block';
    submitBtn.disabled = true;

    try {
        const payload = {
            fullName,
            email,
            password,
            role
        };

        // Thêm các trường dành riêng cho STUDENT
        if (role === 'STUDENT') {
            payload.username = username;
            if (department) payload.department = department;
            if (className)  payload.className  = className;
        }

        const res = await authFetch(`${API_BASE_URL}/admin/create-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            let errorMsg = `HTTP ${res.status}`;
            try {
                const errData = await res.clone().json();
                errorMsg = errData.error || errData.message || errorMsg;
            } catch (err) {}
            throw new Error(errorMsg);
        }

        const roleLabel = role === 'TEACHER' ? 'Giảng Viên' : 'Sinh Viên';
        showToast(`Tạo thành công tài khoản ${roleLabel}!`, 'success');

        // Reset form và redirect
        document.getElementById('createAccountForm').reset();
        ['studentIdGroup','departmentGroup','classNameGroup']
            .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        document.querySelectorAll('.btn').forEach(b => b.disabled = true);

        setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);

    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btnText.style.display   = 'inline';
        btnSpinner.style.display = 'none';
        submitBtn.disabled = false;
    }
});
