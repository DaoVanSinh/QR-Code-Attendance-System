package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SessionResponse {
    private Integer id;
    private Integer courseId;
    private String qrCode;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime expiredAt;
    private String subjectName;
    private String subjectCode;
    private String className;
    private String semester;
    private String room;
    private Integer dayOfWeek;
    private Integer startLesson;
    private Integer endLesson;
    private String teacherName;
}
