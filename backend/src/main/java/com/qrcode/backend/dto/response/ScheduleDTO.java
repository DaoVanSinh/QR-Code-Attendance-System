package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;

@Data
@Builder
public class ScheduleDTO {
    private Integer scheduleId;
    private Integer courseId;
    private String subjectName;
    private String subjectCode;
    private Integer credits;
    private String className;
    private String teacherName;
    private String semester;

    // Schedule info
    private Integer dayOfWeek;
    private String dayOfWeekLabel;
    private Integer startPeriod;
    private Integer endPeriod;
    private Integer numSlots;
    private String room;
    private String startTime;  // Giờ thực (HH:mm)
    private String endTime;    // Giờ thực (HH:mm)
    private Boolean isPrimary;

    // Course info
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer maxSlots;
    private Integer currentSlots;
}
