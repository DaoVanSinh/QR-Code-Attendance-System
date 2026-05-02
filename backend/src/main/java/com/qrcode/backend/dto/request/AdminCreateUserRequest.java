package com.qrcode.backend.dto.request;

import com.qrcode.backend.entity.enums.Role;
import lombok.Data;

import java.time.LocalDate;

@Data
public class AdminCreateUserRequest {
    private String email;
    private String password;
    private String fullName;
    private Role role;
    private String username;       // Mã sinh viên (login identifier, bắt buộc với STUDENT)
    private String studentCode;    // Mã số sinh viên đầy đủ (profile.student_code)
    private String department;
    private String className;
    private LocalDate birthday;
    private String gender;         // "MALE" | "FEMALE" | "OTHER"
}

