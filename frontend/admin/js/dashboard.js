// Auth & sidebar init handled by inline script in dashboard.html

let _allUsers = []; // cache toàn bộ danh sách user (không gồm ADMIN)
let _currentTab = 'STUDENT'; // tab đang active
let _editingUserId = null;   // user đang được edit
let _editingUserEmail = '';  // dùng để kiểm tra xóa admin

document.addEventListener('DOMContentLoaded', loadDashboard);

async function loadDashboard() {
    // ── Load Users ────────────────────────────────
    try {
        const res = await authFetch(`${API_BASE_URL}/admin/users`);
        if (!res.ok) {
            let errorMsg = `HTTP ${res.status}`;
            try { const errData = await res.clone().json(); errorMsg = errData.error || errorMsg; } catch (e) {}
            throw new Error(errorMsg);
        }
        const userData = await res.json();

        // Lọc bỏ tài khoản ADMIN khỏi danh sách
        _allUsers = userData.filter(u => u.role !== 'ADMIN');

        // Cập nhật số lượng tab
        const students = _allUsers.filter(u => u.role === 'STUDENT');
        const teachers  = _allUsers.filter(u => u.role === 'TEACHER');
        document.getElementById('countStudent').textContent = students.length;
        document.getElementById('countTeacher').textContent = teachers.length;

        // Render tab hiện tại
        renderUserTable(_currentTab);

    } catch (e) {
        document.getElementById('userTable').innerHTML =
            `<tr class="error-row"><td colspan="6">Lỗi tải dữ liệu: ${e.message}. Vui lòng đăng nhập lại.</td></tr>`;
    }

    // ── Load Subjects ─────────────────────────────
    try {
        const res2 = await authFetch(`${API_BASE_URL}/admin/subjects`);
        if (!res2.ok) throw new Error();
        const subjects = await res2.json();
        const tbody2 = document.getElementById('subjectTable');

        if (!subjects.length) {
            tbody2.innerHTML = '<tr class="empty-row"><td colspan="4">Chưa có môn học nào</td></tr>';
        } else {
            tbody2.innerHTML = subjects.map(s =>
                `<tr>
                    <td>${s.id}</td>
                    <td><span style="font-family:monospace;background:#f1f5f9;padding:2px 6px;border-radius:4px;color:#334155;font-size:13px;">${s.code}</span></td>
                    <td style="font-weight:500;color:#1e293b;">${s.name}</td>
                </tr>`
            ).join('');
        }
    } catch (e) {
        document.getElementById('subjectTable').innerHTML =
            `<tr class="error-row"><td colspan="3">Lỗi tải môn học.</td></tr>`;
    }
}

// ── Tab switch ────────────────────────────────────────────────────────
function switchTab(role) {
    _currentTab = role;
    document.getElementById('tabStudent').classList.toggle('active', role === 'STUDENT');
    document.getElementById('tabTeacher').classList.toggle('active', role === 'TEACHER');
    renderUserTable(role);
}

function renderUserTable(role) {
    const tbody = document.getElementById('userTable');
    const thMaSV = document.getElementById('thMaSV');

    const filtered = _allUsers.filter(u => u.role === role);

    if (role === 'TEACHER') {
        thMaSV.style.display = 'none';
    } else {
        thMaSV.style.display = '';
    }

    if (!filtered.length) {
        const colspan = role === 'TEACHER' ? 5 : 6;
        tbody.innerHTML = `<tr class="empty-row"><td colspan="${colspan}">Chưa có ${role === 'STUDENT' ? 'sinh viên' : 'giảng viên'} nào</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(u => {
        const date = u.createdAt ? u.createdAt.split('T')[0] : 'N/A';
        const maSVCell = role === 'TEACHER'
            ? ''
            : `<td>${u.username || '<span style="color:rgba(255,255,255,.3)">—</span>'}</td>`;

        return `<tr>
            <td>${u.id}</td>
            <td>${u.email}</td>
            <td>${u.fullName || '<span style="color:rgba(255,255,255,.3)">—</span>'}</td>
            ${maSVCell}
            <td>${date}</td>
            <td style="text-align:right;">
                <button style="background:rgba(37,99,235,.12);border:1px solid rgba(37,99,235,.3);
                               color:#60a5fa;padding:4px 12px;font-size:12px;border-radius:6px;
                               cursor:pointer;font-weight:600;display:inline-flex;align-items:center;gap:5px;"
                        onclick="openEditUser(${u.id})">
                    <ion-icon name="pencil-outline" style="font-size:13px;"></ion-icon> Sửa
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ── Edit User Modal ──────────────────────────────────────────────────
function openEditUser(id) {
    const user = _allUsers.find(u => u.id === id);
    if (!user) return;

    _editingUserId    = id;
    _editingUserEmail = user.email;

    const isStudent = user.role === 'STUDENT';

    document.getElementById('euTitle').textContent =
        `Sửa: ${user.fullName || user.email}`;
    document.getElementById('euFullName').value   = user.fullName || '';
    document.getElementById('euEmail').value      = user.email || '';
    document.getElementById('euPassword').value   = '';
    document.getElementById('euRole').value       = isStudent ? 'Sinh Viên' : 'Giảng Viên';
    document.getElementById('euUsername').value   = user.username || '';
    document.getElementById('euDepartment').value = '';
    document.getElementById('euClassName').value  = '';

    // Hiện/ẩn hàng Mã SV và hàng Khoa/Lớp
    document.getElementById('euStudentIdRow').style.display = isStudent ? 'block' : 'none';
    document.getElementById('euExtraRow').style.display     = isStudent ? 'grid'  : 'none';

    document.getElementById('editUserModal').classList.add('open');
}

function closeEditUser() {
    _editingUserId = null;
    _editingUserEmail = '';
    document.getElementById('editUserModal').classList.remove('open');
}

async function saveEditUser() {
    if (!_editingUserId) return;

    const user     = _allUsers.find(u => u.id === _editingUserId);
    const email    = document.getElementById('euEmail').value.trim();
    const password = document.getElementById('euPassword').value;
    const fullName = document.getElementById('euFullName').value.trim();
    const username = document.getElementById('euUsername').value.trim();
    const dept     = document.getElementById('euDepartment').value.trim();
    const cls      = document.getElementById('euClassName').value.trim();

    if (!email) { showToast('Email không được để trống.', 'error'); return; }

    const btn = document.getElementById('euBtnSave');
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Đang lưu...';

    try {
        const payload = { email };
        if (password) payload.password  = password;
        if (fullName) payload.fullName  = fullName;
        if (dept)     payload.department = dept;
        if (cls)      payload.className  = cls;
        // Mã SV chỉ gửi nếu là STUDENT
        if (user?.role === 'STUDENT' && username) payload.username = username;

        const res = await authFetch(`${API_BASE_URL}/admin/users/${_editingUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast('✅ Cập nhật tài khoản thành công!', 'success');
            closeEditUser();
            loadDashboard();
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Lỗi cập nhật.', 'error');
        }
    } catch {
        showToast('Lỗi kết nối mạng.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Lưu';
    }
}

// Xóa từ modal — confirm bằng toast thay vì native confirm()
function confirmDeleteFromModal() {
    if (!_editingUserId) return;
    if (_editingUserEmail === 'admin@qrcode.com') {
        showToast('Không thể xóa quản trị viên mặc định.', 'error');
        return;
    }

    // Dùng native confirm vì cần đồng bộ + đủ rõ ràng
    if (confirm(`Xóa tài khoản "${_editingUserEmail}"?\nHành động này không thể hoàn tác.`)) {
        deleteUserById(_editingUserId, _editingUserEmail);
    }
}

async function deleteUserById(id, email) {
    try {
        const res = await authFetch(`${API_BASE_URL}/admin/users/${id}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`✅ Đã xóa tài khoản ${email}`, 'success');
            closeEditUser();
            loadDashboard();
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || `Lỗi xóa tài khoản.`, 'error');
        }
    } catch {
        showToast('Lỗi mạng.', 'error');
    }
}

// Close modal khi click overlay
document.getElementById('editUserModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeEditUser();
});

// ── Edit Subject ──────────────────────────────────────────────────
let _editingSubjectId   = null;
let _editingSubjectName = '';

function closeEditSubject() {
    _editingSubjectId   = null;
    _editingSubjectName = '';
    document.getElementById('editSubjectModal').classList.remove('open');
}

async function saveEditSubject() {
    if (!_editingSubjectId) return;
    const code    = document.getElementById('esCode').value.trim();
    const name    = document.getElementById('esName').value.trim();
    const credits = parseInt(document.getElementById('esCredits').value) || 3;

    if (!code || !name) { showToast('Vui lòng nhập đầy đủ Mã Môn và Tên Môn.', 'error'); return; }

    const btn = document.getElementById('esBtnSave');
    btn.disabled = true;
    btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Đang lưu...';

    try {
        const res = await authFetch(`${API_BASE_URL}/admin/subjects/${_editingSubjectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, name, credits })
        });
        if (res.ok) {
            showToast('✅ Cập nhật môn học thành công!', 'success');
            closeEditSubject();
            loadDashboard();
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Lỗi cập nhật.', 'error');
        }
    } catch {
        showToast('Lỗi kết nối mạng.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> Lưu';
    }
}

async function deleteSubjectFromModal() {
    if (!_editingSubjectId) return;

    const btn = document.getElementById('esBtnDelete');
    if (btn) { btn.disabled = true; btn.innerHTML = '<ion-icon name="hourglass-outline"></ion-icon> Đang xóa...'; }

    try {
        const res = await authFetch(`${API_BASE_URL}/admin/subjects/${_editingSubjectId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast(`✅ Đã xóa môn học "${_editingSubjectName}" thành công!`, 'success');
            closeEditSubject();
            loadDashboard();
        } else {
            const data = await res.json().catch(() => ({}));
            showToast(data.error || 'Không thể xóa môn học này.', 'error');
        }
    } catch {
        showToast('Lỗi kết nối mạng.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<ion-icon name="trash-outline"></ion-icon> Xóa Môn'; }
    }
}

document.getElementById('editSubjectModal')?.addEventListener('click', function(e) {
    if (e.target === this) closeEditSubject();
});

// ── Subject Modal (legacy, kept for backward compat) ─────────────
function openSubjectModal() {
    const m = document.getElementById('subjectModal');
    if (m) m.style.display = 'flex';
}

function closeSubjectModal() {
    const m = document.getElementById('subjectModal');
    if (m) m.style.display = 'none';
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
                loadDashboard();
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
