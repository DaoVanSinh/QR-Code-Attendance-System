package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class TimetableResponse {
    /**
     * Schedules grouped by dayOfWeek (2=Mon,...,8=Sun).
     * Each list is sorted by startPeriod.
     */
    private Map<Integer, List<ScheduleDTO>> schedulesByDay;

    /**
     * Tổng số môn học có trong TKB.
     */
    private Integer totalCourses;
}
