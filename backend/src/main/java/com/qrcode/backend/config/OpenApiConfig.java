package com.qrcode.backend.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình Swagger / OpenAPI cho toàn bộ ứng dụng.
 *
 * - @OpenAPIDefinition: Cài thông tin chung (tên, version, mô tả)
 *   và khai báo rằng tất cả các endpoint đều yêu cầu Bearer JWT
 *
 * - @SecurityScheme: Khai báo kiểu xác thực là HTTP Bearer Token
 *   → Swagger UI sẽ hiện nút [Authorize] để nhập JWT
 */
@Configuration
@OpenAPIDefinition(
    info = @Info(
        title       = "QR Attendance API",
        version     = "1.0",
        description = "API hệ thống điểm danh QR Code — Spring Boot 3 + JWT"
    ),
    security = @SecurityRequirement(name = "bearerAuth")
)
@SecurityScheme(
    name   = "bearerAuth",
    type   = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT",
    description  = "Dán JWT token vào đây (KHÔNG cần gõ 'Bearer' — tự động thêm)"
)
public class OpenApiConfig {
    // Không cần viết thêm gì — annotation đã đủ
}
