package com.qrcode.backend.controller;

import com.qrcode.backend.dto.request.LoginRequest;
import com.qrcode.backend.dto.response.AuthResponse;
import com.qrcode.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(Map.of("error", e.getMessage()), HttpStatus.UNAUTHORIZED);
        }
    }

    /**
     * POST /api/auth/refresh-token
     * Body: { "refreshToken": "..." }
     * Response: { "token": "...", "refreshToken": "...", "user": {...} }
     */
    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null || refreshToken.isBlank()) {
            return new ResponseEntity<>(Map.of("error", "Refresh token không được để trống."), HttpStatus.BAD_REQUEST);
        }
        try {
            AuthResponse response = authService.refreshAccessToken(refreshToken);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(Map.of("error", e.getMessage()), HttpStatus.UNAUTHORIZED);
        }
    }

    /**
     * POST /api/auth/logout
     * Body: { "refreshToken": "..." }
     * Thu hồi refresh token trong DB — logout thật sự.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken != null && !refreshToken.isBlank()) {
            authService.logout(refreshToken);
        }
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công."));
    }
}
