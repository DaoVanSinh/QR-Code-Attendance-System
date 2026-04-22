package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AttendanceRecordResponse {
    private Integer studentId;
    private String studentName;
    private String studentEmail;
    private LocalDateTime checkInTime;
}
