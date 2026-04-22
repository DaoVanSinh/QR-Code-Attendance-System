package com.qrcode.backend.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

@Data
public class ManualAttendanceRequest {
    @NotNull
    private List<Integer> studentIds;
}
