package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;

@Data
@Builder
public class CourseResponse {
    private Integer id;
    private String subjectName;
    private String subjectCode;
    private Integer credits;
    private String className;
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
}
