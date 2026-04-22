const token = localStorage.getItem('jwt_token');

if (!token) {
    alert('Unauthorized: You must be logged in.');
    window.location.href = '../student/login.html';
}

async function fetchProfile() {
    try {
        const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('email').value = data.email || '';
            document.getElementById('fullName').value = data.fullName || '';
            document.getElementById('phone').value = data.phone || '';
            document.getElementById('avatar').value = data.avatar || '';
            document.getElementById('roleLabel').innerText = `${data.role} MODULE`;
        } else {
            console.error('Failed to load profile.');
        }
    } catch (e) {
        console.error('Network Error.', e);
    }
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const phone = document.getElementById('phone').value;
    const avatar = document.getElementById('avatar').value;
    const submitBtn = document.getElementById('submitBtn');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    
    errorMsg.style.display = 'none';
    successMsg.style.display = 'none';
    submitBtn.innerText = 'Saving...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`/api/user/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ phone, avatar })
        });
        
        if (response.ok) {
            successMsg.innerText = 'Profile updated securely!';
            successMsg.style.display = 'block';
        } else {
            errorMsg.innerText = 'Failed to update user profile.';
            errorMsg.style.display = 'block';
        }
    } catch (error) {
        errorMsg.innerText = 'Network connection problem.';
        errorMsg.style.display = 'block';
    } finally {
        submitBtn.innerText = 'Save Changes';
        submitBtn.disabled = false;
    }
});

// Auto load
fetchProfile();
