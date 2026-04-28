package com.qrcode.backend.dto.request;

import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateCourseRequest {
    // Subject info
    private String subjectCode;
    private String subjectName;
    private Integer credits;

    // Course info
    private Integer teacherId;
    private String className;
    private String room;
    private Integer dayOfWeek;
    private Integer startLesson;
    private Integer endLesson;
    private String semester;
    private Integer semesterId;
    private Integer maxSlots;
    private LocalDate startDate;
    private LocalDate endDate;
}

