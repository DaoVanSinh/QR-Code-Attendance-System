package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminSessionResponse {
    private Integer id;
    private Integer courseId;
    private String subjectCode;
    private String subjectName;
    private String className;
    private String teacherName;
    private String teacherEmail;
    private String semester;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime expiredAt;
    private boolean expired;
    private int attendanceCount;
}
