package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class MyAttendanceResponse {
    private Integer attendanceId;
    private Integer sessionId;
    private String subjectName;
    private String subjectCode;
    private String className;
    private String semester;
    private LocalDateTime sessionStartTime;
    private LocalDateTime sessionEndTime;
    private LocalDateTime checkInTime;
}
