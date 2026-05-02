package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class ProfileResponse {
    private String email;
    private String username;       // Mã sinh viên (STUDENT only)
    private String fullName;
    private String phone;
    private String avatar;
    private String role;
    private LocalDate birthday;
    private String gender;
    private String studentCode;    // Mã số SV từ profile
    private String department;
    private String className;
}

