package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SessionSummaryResponse {
    private Integer id;
    private Integer courseId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime expiredAt;
    private boolean expired;
    private int attendanceCount;
}
