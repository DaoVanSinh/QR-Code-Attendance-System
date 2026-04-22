// Auth & sidebar init handled by inline script in dashboard.html
document.addEventListener('DOMContentLoaded', loadDashboard);

async function loadDashboard() {
    // ── Load Users ────────────────────────────────
    try {
        const res = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        if (!res.ok) {
            let errorMsg = `HTTP ${res.status}`;
            try { const errData = await res.clone().json(); errorMsg = errData.error || errorMsg; } catch (e) {}
            throw new Error(errorMsg);
        }
        const userData = await res.json();
        const tbody = document.getElementById('userTable');

        if (!userData.length) {
            tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Chưa có người dùng nào</td></tr>';
        } else {
            tbody.innerHTML = userData.map(u => {
                const color = u.role === 'ADMIN' ? '#f72585' : u.role === 'TEACHER' ? '#4cc9f0' : '#06d6a0';
                const date = u.createdAt ? u.createdAt.split('T')[0] : 'N/A';
                return `<tr>
                    <td>${u.id}</td>
                    <td>${u.email}</td>
                    <td>${u.fullName || '<span style="color:rgba(255,255,255,.3)">—</span>'}</td>
                    <td>${u.username || '<span style="color:rgba(255,255,255,.3)">—</span>'}</td>
                    <td><span class="badge" style="background:rgba(255,255,255,.07);color:${color}">${u.role}</span></td>
                    <td>${date}</td>
                    <td style="text-align:right;">
                        <button style="background:transparent;border:1px solid var(--danger);color:var(--danger);padding:4px 10px;font-size:12px;border-radius:6px;cursor:pointer;" onclick="deleteUser(${u.id}, '${u.email}')">Xóa</button>
                    </td>
                </tr>`;
            }).join('');
        }
    } catch (e) {
        document.getElementById('userTable').innerHTML =
            `<tr class="error-row"><td colspan="5">Lỗi tải dữ liệu: ${e.message}. Vui lòng đăng nhập lại.</td></tr>`;
    }

    // ── Load Subjects ─────────────────────────────
    try {
        const res2 = await fetch(`${API_BASE_URL}/admin/subjects`, {
            headers: { 'Authorization': `Bearer ${auth.token}` }
        });
        if (!res2.ok) {
            let errorMsg2 = `HTTP ${res2.status}`;
            try { const errData2 = await res2.clone().json(); errorMsg2 = errData2.error || errorMsg2; } catch (e) {}
            throw new Error(errorMsg2);
        }
        const subjects = await res2.json();
        const tbody2 = document.getElementById('subjectTable');

        if (!subjects.length) {
            tbody2.innerHTML = '<tr class="empty-row"><td colspan="3">Chưa có môn học nào</td></tr>';
        } else {
            tbody2.innerHTML = subjects.map(s =>
                `<tr><td>${s.id}</td><td>${s.code}</td><td>${s.name}</td></tr>`
            ).join('');
        }
    } catch (e) {
        document.getElementById('subjectTable').innerHTML =
            `<tr class="error-row"><td colspan="4">Lỗi tải môn học.</td></tr>`;
    }
}

async function deleteUser(id, email) {
    if (email === 'admin@qrcode.com') {
        showToast('Không thể xóa quản trị viên mặc định', 'error');
        return;
    }
    const currentEmail = localStorage.getItem('user_name') || '';
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản ${email} không? Hành động này sẽ xóa toàn bộ hồ sơ của họ.`)) {
        try {
            const res = await authFetch(`${API_BASE_URL}/admin/users/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                showToast(`Đã xóa tài khoản ${email}`, 'success');
                loadDashboard(); // reload table
            } else {
                let errorMsg = `HTTP ${res.status}`;
                try { const errData = await res.json(); errorMsg = errData.error || errorMsg; } catch (e) {}
                showToast(`Lỗi: ${errorMsg}`, 'error');
            }
        } catch (e) {
            showToast('Lỗi mạng', 'error');
        }
    }
}

// ── Subject Management ────────────────────────
function openSubjectModal() {
    document.getElementById('subjectModal').style.display = 'flex';
}

function closeSubjectModal() {
    document.getElementById('subjectModal').style.display = 'none';
}

const subjectForm = document.getElementById('subjectForm');
if (subjectForm) {
    subjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('subjectCode').value;
        const name = document.getElementById('subjectName').value;

        try {
            const res = await authFetch(`${API_BASE_URL}/admin/subjects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, name })
            });

            if (res.ok) {
                showToast('Tạo môn học thành công!');
                closeSubjectModal();
                subjectForm.reset();
                loadDashboard(); // reload subject table
            } else {
                let errorMsg = `Lỗi hệ thống`;
                try { const errData = await res.json(); errorMsg = errData.error || errorMsg; } catch (e) {}
                showToast(errorMsg, 'error');
            }
        } catch (e) {
            showToast('Lỗi mạng', 'error');
        }
    });
}
