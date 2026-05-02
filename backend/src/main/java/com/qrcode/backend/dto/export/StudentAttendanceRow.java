package com.qrcode.backend.dto.export;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Thông tin điểm danh của một sinh viên trong một buổi học.
 */
@Data
@Builder
@Schema(description = "Dữ liệu điểm danh của một sinh viên trong một buổi học")
public class StudentAttendanceRow {

    @Schema(description = "Số thứ tự trong danh sách", example = "1")
    private int stt;

    @Schema(description = "Mã sinh viên (username dùng để đăng nhập)", example = "B21DCCN001")
    private String studentCode;

    @Schema(description = "Họ và tên sinh viên", example = "Trần Thị B")
    private String fullName;

    @Schema(description = "Trạng thái điểm danh: true = Có mặt, false = Vắng mặt")
    private boolean present;

    @Schema(description = "Thời gian quét mã QR (null nếu vắng mặt)", example = "2024-10-01T08:05:30")
    private LocalDateTime checkInTime;
}
