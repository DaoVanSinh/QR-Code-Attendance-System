package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class ManualAttendanceStudentResponse {
    private Integer studentId;
    private String studentCode;   // username = mã sinh viên
    private String studentName;
    private String studentEmail;
    private boolean present;
    private LocalDateTime checkInTime;

}
