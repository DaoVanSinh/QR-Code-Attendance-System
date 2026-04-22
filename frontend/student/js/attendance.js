const auth = checkAuth('STUDENT');

if (auth) {
    const nameEl = document.getElementById('studentName');
    if(nameEl) nameEl.textContent = auth.name || 'Sinh Viên';

    // Auto submit if url contains ?qr=
    const params = new URLSearchParams(window.location.search);
    if (params.has('qr')) {
        document.getElementById('reader').style.display = 'none';
        document.getElementById('scanStatus').innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> <span>Hệ thống đang tự xử lý điểm danh với link truy cập...</span>';
        submitAttendance(params.get('qr'));
    } else {
        initScanner();
    }
}

let isProcessing = false;
let html5QrCode;

function initScanner() {
    html5QrCode = new Html5Qrcode("reader");
    const btnStart = document.getElementById('btnStartCamera');
    const scanStatus = document.getElementById('scanStatus');
    
    if (btnStart) {
        btnStart.addEventListener('click', () => {
            btnStart.style.display = 'none';
            scanStatus.style.display = 'block';
            scanStatus.innerHTML = '<ion-icon name="scan-outline"></ion-icon> <span>Sẵn sàng quét mã QR...</span>';
            scanStatus.style.color = "var(--primary)";
            
            html5QrCode.start(
                { facingMode: "environment" }, 
                { fps: 10, qrbox: { width: 250, height: 250 } },
                onScanSuccess,
                onScanFailure
            ).catch(err1 => {
                // Thử lại bằng camera mặc định nếu điện thoại không có camera sau (ví dụ: máy tính/laptop)
                html5QrCode.start(
                    { facingMode: "user" }, // User camera usually always exists if environment fails
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    onScanSuccess,
                    onScanFailure
                ).catch(err2 => {
                    scanStatus.innerHTML = `<ion-icon name="warning-outline"></ion-icon> <span>Lỗi Camera: Bị chặn quyền hoặc cần chạy trên HTTPS.</span>`;
                    scanStatus.style.color = "var(--danger)";
                    btnStart.style.display = 'inline-flex';
                    btnStart.innerHTML = '<ion-icon name="refresh-outline" style="margin-right:6px;"></ion-icon> Thử Lại';
                });
            });
        });
    }

    function onScanSuccess(decodedText, decodedResult) {
        if (isProcessing) return;
        
        isProcessing = true;
        scanStatus.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> <span>Đang xử lý dữ liệu...</span>';
        scanStatus.style.color = "var(--text-muted)";
        
        try {
            html5QrCode.pause(true);
        } catch(e) {}

        submitAttendance(decodedText);
    }

    function onScanFailure(error) {
        // Ignore continuous frame failures
    }
}

async function submitAttendance(qrCodeContent) {
    try {
        const response = await authFetch(`${API_BASE_URL}/student/attendances/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCode: qrCodeContent })
        });

        const data = await response.json();

        if (response.ok) {
            showSuccessOverlay();
        } else {
            const errStr = data.error || 'Lỗi điểm danh. Vui lòng thử lại.';
            showToast(errStr, 'error');
            resetScanner(errStr);
        }
    } catch (error) {
        showToast('Lỗi mạng lưới kết nối.', 'error');
        resetScanner('Lỗi mạng lưới kết nối.');
    }
}

function resetScanner(errorMessage = null) {
    setTimeout(() => {
        isProcessing = false;
        const params = new URLSearchParams(window.location.search);
        const scanStatus = document.getElementById('scanStatus');
        
        if (params.has('qr')) {
            const displayErr = errorMessage || 'Link điểm danh không hợp lệ hoặc đã hết hạn.';
            scanStatus.innerHTML = `<ion-icon name="warning-outline"></ion-icon> <span>${displayErr} <br><a href="attendance.html" style="color:var(--primary);margin-top:8px;display:inline-block;">Thử quét lại tại đây</a></span>`;
            scanStatus.style.color = "var(--danger)";
            scanStatus.style.display = 'block';
        } else {
            scanStatus.innerHTML = '<ion-icon name="scan-outline"></ion-icon> <span>Sẵn sàng quét mã QR...</span>';
            scanStatus.style.color = "var(--primary)";
            if (html5QrCode) {
                try { html5QrCode.resume(); } catch(e) {}
            }
        }
    }, 2500);
}

function showSuccessOverlay() {
    const overlay = document.getElementById('successOverlay');
    overlay.classList.add('show');
    
    // Attempt to stop camera completely
    try {
        if(html5QrCode) html5QrCode.stop();
    } catch(e){}

    let countdown = 3;
    const countEl = document.getElementById('overlayCountdown');
    
    const interval = setInterval(() => {
        countdown--;
        countEl.textContent = countdown;
        if(countdown <= 0) {
            clearInterval(interval);
            window.location.href = 'index.html';
        }
    }, 1000);
}
