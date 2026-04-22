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
    private String room;
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean enrolled;
}
