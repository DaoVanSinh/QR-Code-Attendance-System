document.getElementById('pwdForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const submitBtn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
    submitBtn.innerText = 'Updating...';
    submitBtn.disabled = true;

    // Use JWT strictly for all requests
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        errorMsg.innerText = 'Access denied. You must be logged in.';
        errorMsg.style.display = 'block';
        submitBtn.innerText = 'Update Password';
        submitBtn.disabled = false;
        return;
    }
    
    try {
        const response = await fetch(`/api/user/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });
        
        if (response.ok) {
            successMsg.innerText = 'Password updated successfully! Next time use your completely new password.';
            successMsg.style.display = 'block';
            document.getElementById('pwdForm').reset();
        } else {
            const data = await response.json();
            errorMsg.innerText = data.error || 'Failed to update password. Check your old password.';
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        errorMsg.innerText = 'Network Error connecting to securely proxied server.';
        errorMsg.style.display = 'block';
    } finally {
        submitBtn.innerText = 'Update Password';
        submitBtn.disabled = false;
    }
});
