package com.qrcode.backend.dto.request;
import com.qrcode.backend.entity.enums.Role;
import lombok.Data;

@Data
public class AdminCreateUserRequest {
    private String email;
    private String password;
    private String fullName;
    private Role role;
    private String username;
}
