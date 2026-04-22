package com.qrcode.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {
    @NotBlank(message = "Email hoặc mã sinh viên là bắt buộc")
    private String identifier;

    @NotBlank(message = "Mật khẩu là bắt buộc")
    private String password;
}
