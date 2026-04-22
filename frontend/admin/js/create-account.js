// Auth & sidebar init handled by inline script in create-account.html

// Toggle username (mã sinh viên) field based on role selection
document.getElementById('role').addEventListener('change', function() {
    const studentIdGroup = document.getElementById('studentIdGroup');
    const usernameInput = document.getElementById('username');
    if (this.value === 'STUDENT') {
        studentIdGroup.style.display = 'block';
        usernameInput.setAttribute('required', 'required');
    } else {
        studentIdGroup.style.display = 'none';
        usernameInput.removeAttribute('required');
        usernameInput.value = '';
    }
});

document.getElementById('createAccountForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.getElementById('role').value;
    const username = document.getElementById('username').value.trim();

    if (!role) {
        showToast('Vui lòng chọn vai trò cho tài khoản!', 'error');
        return;
    }

    if (role === 'STUDENT' && !username) {
        showToast('Vui lòng nhập mã sinh viên!', 'error');
        return;
    }

    // Show loading state
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    const submitBtn = document.getElementById('submitBtn');
    btnText.style.display = 'none';
    btnSpinner.style.display = 'inline-block';
    submitBtn.disabled = true;

    try {
        const payload = {
            fullName: fullName,
            email: email,
            password: password,
            role: role
        };

        // Include username for STUDENT role (mã sinh viên)
        if (role === 'STUDENT') {
            payload.username = username;
        }

        const res = await authFetch(`${API_BASE_URL}/admin/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
        
        // Disable form and redirect after a short delay
        document.getElementById('createAccountForm').reset();
        document.getElementById('studentIdGroup').style.display = 'none';
        const btns = document.querySelectorAll('.btn');
        btns.forEach(b => b.disabled = true);
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (e) {
        showToast(e.message, 'error');
    } finally {
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        submitBtn.disabled = false;
    }
});
