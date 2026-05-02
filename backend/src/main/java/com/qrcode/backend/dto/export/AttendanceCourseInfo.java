package com.qrcode.backend.dto.export;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

/**
 * Thông tin học phần hiển thị ở header của file Excel báo cáo điểm danh.
 */
@Data
@Builder
@Schema(description = "Thông tin cơ bản của học phần dùng để xuất báo cáo điểm danh")
public class AttendanceCourseInfo {

    @Schema(description = "Tên học phần", example = "Lập Trình Web")
    private String subjectName;

    @Schema(description = "Mã lớp học phần", example = "LHP-2024-CS101-A")
    private String courseCode;

    @Schema(description = "Họ tên giảng viên phụ trách", example = "Nguyễn Văn A")
    private String teacherName;

    @Schema(description = "Tên học kỳ", example = "Học kỳ 1 (2024-2025)")
    private String semesterName;
}
