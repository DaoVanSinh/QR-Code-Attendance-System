package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EnrolledStudentResponse {
    private Integer studentId;
    private String  fullName;
    private String  email;
    private String  username;    // Mã sinh viên
    private String  className;   // Lớp hành chính (từ profile)
    private String  enrolledAt;  // Ngày đăng ký
    private String  status;      // ACTIVE / INACTIVE
}
