package com.qrcode.backend.dto.export;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * DTO tổng hợp dùng để truyền vào ExportService khi xuất báo cáo điểm danh.
 * Bao gồm thông tin học phần và danh sách điểm danh của từng sinh viên.
 */
@Data
@Builder
@Schema(description = "DTO đầu vào cho ExportService: gồm thông tin học phần và danh sách điểm danh")
public class AttendanceReportDTO {

    @Schema(description = "Thông tin học phần (tên, mã lớp, giảng viên, học kỳ)")
    private AttendanceCourseInfo courseInfo;

    @Schema(description = "Danh sách điểm danh của toàn bộ sinh viên đã đăng ký học phần này")
    private List<StudentAttendanceRow> students;
}
