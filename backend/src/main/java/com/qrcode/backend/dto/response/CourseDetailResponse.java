package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;

@Data
@Builder
public class CourseDetailResponse {
    private Integer id;
    private String subjectName;
    private String subjectCode;
    private String className;
    private String classCode;
    private Integer teacherId;
    private String teacherName;
    private String teacherEmail;
    private String semester;
    private Integer credits;
    private Integer dayOfWeek;
    private Integer startLesson;
    private Integer endLesson;
    private String room;
    private LocalDate startDate;
    private LocalDate endDate;
}
