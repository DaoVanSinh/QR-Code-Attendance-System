package com.qrcode.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryResponse {
    private Integer id;
    private String email;
    private String role;
    private String fullName;
    private String username;
    private String createdAt;
}
