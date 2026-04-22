package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDate;

@Data
@Builder
public class SemesterResponse {
    private Integer id;
    private String name;        // HK1, HK2, HK3
    private String schoolYear;  // 2025-2026
    private String label;       // "HK1 — 2025-2026"
    private String labelFull;   // "Học kỳ 1 — 2025-2026"
    private LocalDate startDate;
    private LocalDate endDate;
    private Boolean isActive;

    // Số tuần học (tính từ start → end)
    private Integer totalWeeks;

    // Tên học kỳ tiếng Việt đầy đủ
    private String nameFull;    // "Học kỳ 1", "Học kỳ 2", "Học kỳ hè"
}
