package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;

@Data
@Builder
public class EnrolledCourseResponse {
    private Integer courseId;
    private String subjectCode;
    private String subjectName;
    private Integer credits;
    private String className;
    private String teacherName;
    private String semester;
    private Integer dayOfWeek;
    private Integer startLesson;
    private Integer endLesson;

    private Integer dayOfWeek2;
    private Integer startLesson2;
    private Integer endLesson2;

    private String room;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean enrolled;
    private Integer maxSlots;
    private Integer currentSlots;
    private String regStatus;
}

