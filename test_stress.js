/*
  STRESS TEST SCRIPT (50 CONCURRENT CHECK-INS)
  Mục đích: Kiểm tra Race Condition của Database khi 50 request điểm danh đồng loạt nã vào Server.
  Yêu cầu: Môi trường có NodeJS v18+ (Dùng Native Fetch).
  
  Cách chạy: node test_stress.js
*/
const API_URL = "http://localhost:8080/api/student/attendances/check-in";

// 1. Dán JWT hợp lệ của Sinh viên vào đây
const JWT_TOKEN = "YOUR_VALID_STUDENT_JWT_HERE";

// 2. Dán QR Code lấy từ màn hình Giáo viên vào đây
const QR_CODE = "UUID_QR_CODE_HERE";

async function makeRequest(id) {
    const startTime = Date.now();
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${JWT_TOKEN}`
            },
            body: JSON.stringify({ qrCode: QR_CODE })
        });
        const data = await response.json();
        const latency = Date.now() - startTime;
        
        // Response
        if(response.ok) {
           console.log(`[Req-${id}] ✅ SUCCESS (${latency}ms) - Bảng Attendance đã ghi nhận.`);
        } else {
           console.log(`[Req-${id}] ❌ FAILED (${latency}ms) - Status: ${response.status} -> ${data.error}`);
        }
    } catch (e) {
        console.error(`[Req-${id}] ⚠️ NETWORK ERROR: ${e.message}`);
    }
}

async function run() {
    console.log("🚀 STARTING CONCURRENT STRESS TEST: 50 REQUESTS IN PARALLEL...");
    const promises = [];
    for (let i = 1; i <= 50; i++) {
        promises.push(makeRequest(i)); // Không await ở đây để gọi bất đồng bộ hoàn toàn
    }
    
    // Đợi 50 request resolve
    await Promise.all(promises);
    console.log("\n✅ STRESS TEST COMPLETED!");
    console.log("Bạn sẽ chỉ thấy tối đa 1 Req thành công, 49 Reqs còn lại báo lỗi 409 (DuplicateAttendance) nhờ DB Lock Unique!");
}

run();
