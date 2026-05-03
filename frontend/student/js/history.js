const auth = checkAuth('STUDENT');

let allRecords = [];

if (auth) {
    document.getElementById('studentName').textContent = auth.name || 'Sinh Viên';
    // Load avatar từ cache trước
    const cachedAvatar = storageGet('user_avatar');
    const avatarEl = document.getElementById('studentAvatar');
    if (cachedAvatar && cachedAvatar.length > 10 && avatarEl) {
        avatarEl.src = cachedAvatar;
    }
    // Fetch mới nhất từ server
    fetchAndCacheAvatar();
    loadHistory();
    document.getElementById('semesterFilter').addEventListener('change', renderHistory);
}

async function loadHistory() {
    const container = document.getElementById('historyContainer');
    
    try {
        const res = await authFetch(`${API_BASE_URL}/student/my-attendances`);
        if (!res.ok) throw new Error();
        allRecords = await res.json();
        
        // Populate dropdown with unique semesters
        const semesters = [...new Set(allRecords.map(r => r.semester).filter(Boolean))].sort();
        const select = document.getElementById('semesterFilter');
        select.innerHTML = '<option value="ALL">Tất cả học kỳ</option>' + 
            semesters.map(s => `<option value="${s}">${s}</option>`).join('');

        renderHistory();
    } catch {
        container.innerHTML = `
            <div class="empty-state">
                <ion-icon name="warning-outline" style="color:var(--danger);"></ion-icon>
                <p>Không thể tải dữ liệu lịch sử.</p>
            </div>
        `;
    }
}

function renderHistory() {
    const container = document.getElementById('historyContainer');
    const filter = document.getElementById('semesterFilter').value;
    
    let filteredRecords = allRecords;
    if (filter !== 'ALL') {
        filteredRecords = allRecords.filter(r => r.semester === filter);
    }

    if (!filteredRecords.length) {
        container.innerHTML = `
            <div class="empty-state">
                <ion-icon name="documents-outline"></ion-icon>
                <p>Bạn chưa có lịch sử điểm danh nào.</p>
            </div>
        `;
        return;
    }

    // Group by subjectCode + className
    const grouped = {};
    filteredRecords.forEach(r => {
        const key = `${r.subjectCode} - ${r.subjectName} (${r.className})`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(r);
    });

        let html = '';
        for (const [subject, attendances] of Object.entries(grouped)) {
            html += `
                <div class="glass-card" style="padding:16px;">
                    <h2 style="font-size:15px;font-weight:700;color:var(--primary);margin-bottom:12px;border-bottom:1px solid var(--glass-border);padding-bottom:8px;">
                        ${subject}
                    </h2>
                    <div style="display:flex;flex-direction:column;gap:8px;">
            `;
            
            attendances.forEach(att => {
                const checkInUTC = att.checkInTime + (att.checkInTime.endsWith('Z') ? '' : 'Z');
                const sessionStartUTC = att.sessionStartTime + (att.sessionStartTime.endsWith('Z') ? '' : 'Z');
                
                const checkIn = new Date(checkInUTC);
                const sessionStart = new Date(sessionStartUTC);
                
                html += `
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <div style="font-size:13px;font-weight:600;">Buổi học ngày ${sessionStart.toLocaleDateString('vi-VN')}</div>
                            <div style="font-size:11px;color:var(--text-muted);">${sessionStart.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                        <div style="text-align:right;">
                            <span class="badge badge-subject">✓ Có mặt</span>
                            <div style="font-size:11px;color:var(--success);margin-top:4px;">Lúc ${checkIn.toLocaleTimeString('vi-VN', {hour:'2-digit', minute:'2-digit'})}</div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        }

        container.innerHTML = html;
}
