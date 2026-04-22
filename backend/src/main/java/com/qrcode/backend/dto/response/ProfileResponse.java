package com.qrcode.backend.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProfileResponse {
    private String email;
    private String fullName;
    private String phone;
    private String avatar;
    private String role;
}
