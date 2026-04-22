package com.qrcode.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateSessionRequest {
    @NotNull(message = "Thời gian là bắt buộc")
    private Integer durationMinutes;
}
