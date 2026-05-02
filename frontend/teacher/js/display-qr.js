const auth = checkAuth('TEACHER');
if (auth) {
    document.getElementById('sidebar-placeholder').innerHTML = buildSidebar('display-qr.html');
    fetchAndCacheAvatar();
}

let qrCodeValue = localStorage.getItem('current_qr_code');
const expiredAtStr = localStorage.getItem('current_expired_at');
const sessionId = localStorage.getItem('current_session_id');

const LESSON_TIMES = {
    1: '06:45', 2: '07:45', 3: '08:45', 4: '09:45', 5: '10:45',
    6: '12:30', 7: '13:30', 8: '14:30', 9: '15:30', 10: '16:30',
    11: '17:30', 12: '18:30', 13: '19:30'
};
const LESSON_END_TIMES = {
    1: '07:35', 2: '08:35', 3: '09:35', 4: '10:35', 5: '11:35',
    6: '13:20', 7: '14:20', 8: '15:20', 9: '16:20', 10: '17:20',
    11: '18:20', 12: '19:20', 13: '20:20'
};
const DOW_LABELS = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
let qrCodeObj = null;

if (!qrCodeValue || !expiredAtStr || !sessionId) {
    alert('Không tìm thấy phiên điểm danh khả dụng.');
    window.location.href = 'create-session.html';
} else {
    function renderSessionInfo() {
        const box = document.getElementById('sessionInfoBox');
        if (!box) return;
        let info = {};
        try {
            info = JSON.parse(localStorage.getItem('current_course_info') || '{}');
        } catch (e) { return; }
        if (!info.subjectName) { box.style.display = 'none'; return; }

        const timeStr = info.startLesson
            ? `${LESSON_TIMES[info.startLesson]} – ${LESSON_END_TIMES[info.endLesson]}`
            : 'N/A';

        box.innerHTML = `
            <div style="font-weight:700;font-size:15px;color:var(--primary-dark);margin-bottom:8px;">
                 Thông tin buổi điểm danh
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;line-height:1.9;font-size:13px;">
                <div> <strong>${info.subjectCode}</strong> — ${info.subjectName}</div>
                <div> Nhóm: <strong>${info.className}</strong></div>
                <div>Phòng: <strong>${info.room || 'N/A'}</strong></div>
                <div>Lịch: <strong>${DOW_LABELS[info.dayOfWeek] || ''} | Tiết ${info.startLesson}→${info.endLesson}</strong></div>
                <div>Giờ học: <strong>${timeStr}</strong></div>
                <div>Học kỳ: ${info.semester}</div>
            </div>
            <div style="margin-top:10px;padding:8px 12px;background:#fff3e0;border-radius:4px;font-weight:700;color:#e65100;font-size:13px;">
                 Buổi học ngày: ${info.sessionDate || new Date().toLocaleDateString('vi-VN')}
            </div>
        `;
    }
    renderSessionInfo();

    // Function to generate full QR url
    const getQrScanUrl = (code) => {
        return window.location.origin + '/student/attendance.html?qr=' + code;
    }

    // Generate Initial QR
    qrCodeObj = new QRCode(document.getElementById('qrcode'), {
        text: getQrScanUrl(qrCodeValue),
        width: 260,
        height: 260,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });

    // Fix timezone issue by treating string as UTC if Z is missing
    const expiredStrUTC = expiredAtStr.endsWith('Z') ? expiredAtStr : expiredAtStr + 'Z';
    const expiredTime = new Date(expiredStrUTC).getTime();
    const display = document.getElementById('timerDisplay');

    // Main UI countdown counter (Session expiry)
    let qrIntervalRef; // forward declare so countdown can clear it

    const interval = setInterval(() => {
        const distance = expiredTime - Date.now();
        if (distance < 0) {
            clearInterval(interval);
            if (qrIntervalRef) clearInterval(qrIntervalRef); // stop QR refresh too
            display.textContent = 'HẾT HẠN';
            display.classList.add('expired');
            document.getElementById('qrcode').style.opacity = '0.25';
            if (progressEl) progressEl.style.width = '0%';
            if (qrReloadSecEl) qrReloadSecEl.textContent = '0';
        } else {
            const m = Math.floor(distance / 60000);
            const s = Math.floor((distance % 60000) / 1000);
            display.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
    }, 1000);

    // QR Rotate and Progress Bar Update
    let qrReloadSeconds = 30;
    const progressEl = document.getElementById('qrProgress');
    const qrReloadSecEl = document.getElementById('qrReloadSec');

    qrIntervalRef = setInterval(async () => {
        const distance = expiredTime - Date.now();
        // Don't refresh if expired
        if (distance < 0) {
            clearInterval(qrIntervalRef);
            if (progressEl) progressEl.style.width = '0%';
            if (qrReloadSecEl) qrReloadSecEl.textContent = '0';
            return;
        }

        qrReloadSeconds--;
        if (qrReloadSecEl) qrReloadSecEl.textContent = qrReloadSeconds;
        if (progressEl) progressEl.style.width = `${(qrReloadSeconds / 30) * 100}%`;

        if (qrReloadSeconds <= 0) {
            qrReloadSeconds = 30; // reset for next cycle
            if (qrReloadSecEl) qrReloadSecEl.textContent = '30';
            if (progressEl) progressEl.style.width = '100%';

            try {
                const res = await authFetch(`${API_BASE_URL}/teacher/sessions/${sessionId}/refresh-qr`, { method: 'PUT' });
                if (res.ok) {
                    const data = await res.json();
                    qrCodeValue = data.qrCode;
                    localStorage.setItem('current_qr_code', qrCodeValue);
                    document.getElementById('qrcode').innerHTML = '';
                    qrCodeObj = new QRCode(document.getElementById('qrcode'), {
                        text: getQrScanUrl(qrCodeValue),
                        width: 260,
                        height: 260,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
                    });
                    console.log('🔄 QR Code refreshed successfully');
                } else if (res.status === 403 || res.status === 401) {
                    console.warn('🛑 Phiên đã hết hạn hoặc mất quyền, dừng refresh QR.');
                    clearInterval(qrIntervalRef);
                    display.textContent = 'HẾT HẠN';
                    display.classList.add('expired');
                    document.getElementById('qrcode').style.opacity = '0.25';
                    if (progressEl) progressEl.style.width = '0%';
                }
            } catch (error) {
                console.error('Lỗi khi tải mới mã QR:', error);
            }
        }
    }, 1000);
}
