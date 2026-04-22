package com.qrcode.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CheckInRequest {
    @NotBlank(message = "Mã QR là bắt buộc")
    private String qrCode;
}
