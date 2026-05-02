package com.qrcode.backend.dto.request;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ProfileUpdateRequest {
    private String email;          // Cho phép cập nhật email
    private String fullName;
    private String phone;
    private String avatar;
    private LocalDate birthday;
    private String gender;         // "MALE" | "FEMALE" | "OTHER"
    private String department;
    private String className;
    // username & studentCode KHÔNG có ở đây — read-only, chỉ Admin cấp
}

