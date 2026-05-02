package com.qrcode.backend.service;

import com.qrcode.backend.dto.request.LoginRequest;
import com.qrcode.backend.dto.response.AuthResponse;
import com.qrcode.backend.entity.User;
import com.qrcode.backend.entity.enums.Role;
import com.qrcode.backend.repository.UserRepository;
import com.qrcode.backend.security.CustomUserDetails;
import com.qrcode.backend.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final AuditService auditService;

    // ── Login ─────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getIdentifier().trim();

        // ── Resolve identifier → email ────────────────────────────
        String email;
        if (identifier.contains("@")) {
            // Đăng nhập bằng email — cho phép mọi role
            email = identifier.toLowerCase();
        } else {
            // Đăng nhập bằng mã (username) — CHỈ dành cho STUDENT
            User foundUser = userRepository.findByUsername(identifier)
                    .orElseThrow(() -> new IllegalArgumentException("Mã sinh viên không tồn tại."));
            if (foundUser.getRole() != Role.STUDENT) {
                throw new IllegalArgumentException("Admin và Giáo viên phải đăng nhập bằng email.");
            }
            email = foundUser.getEmail();
        }

        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword())
            );
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            throw new IllegalArgumentException("Mật khẩu không đúng.");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("Email hoặc mật khẩu không đúng"));

        // ── Sinh access token (JWT) ───────────────────────────────
        String jwt = jwtUtils.generateToken(new CustomUserDetails(user));

        // ── Sinh refresh token (opaque UUID) và lưu DB ───────────
        String refreshToken = jwtUtils.generateRefreshToken();
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(jwtUtils.getRefreshTokenExpiryDate());
        userRepository.save(user);

        String fullName = (user.getProfile() != null) ? user.getProfile().getFullName() : null;
        String avatar   = (user.getProfile() != null) ? user.getProfile().getAvatar()   : null;

        AuthResponse.UserProfileDto userProfileDto = AuthResponse.UserProfileDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole().name())
                .fullName(fullName)
                .avatar(avatar)
                .username(user.getUsername())
                .build();

        auditService.logAction(user, "LOGIN_SUCCESS", "User logged in with identifier: " + identifier);

        return AuthResponse.builder()
                .token(jwt)
                .refreshToken(refreshToken)
                .user(userProfileDto)
                .build();
    }

    // ── Refresh Access Token ──────────────────────────────────────────

    /**
     * Dùng refresh token để lấy access token mới.
     * Thực hiện token rotation: refresh token cũ bị xóa, cấp token mới.
     */
    @Transactional
    public AuthResponse refreshAccessToken(String refreshToken) {
        User user = userRepository.findByRefreshToken(refreshToken)
                .orElseThrow(() -> new IllegalArgumentException("Refresh token không hợp lệ hoặc đã bị thu hồi."));

        // Kiểm tra hạn
        if (user.getRefreshTokenExpiry() == null ||
                user.getRefreshTokenExpiry().isBefore(LocalDateTime.now())) {
            // Xóa token hết hạn
            user.setRefreshToken(null);
            user.setRefreshTokenExpiry(null);
            userRepository.save(user);
            throw new IllegalArgumentException("Refresh token đã hết hạn. Vui lòng đăng nhập lại.");
        }

        // Sinh access token mới
        String newJwt = jwtUtils.generateToken(new CustomUserDetails(user));

        // Token Rotation — sinh refresh token mới, vô hiệu hóa cái cũ
        String newRefreshToken = jwtUtils.generateRefreshToken();
        user.setRefreshToken(newRefreshToken);
        user.setRefreshTokenExpiry(jwtUtils.getRefreshTokenExpiryDate());
        userRepository.save(user);

        String fullName = (user.getProfile() != null) ? user.getProfile().getFullName() : null;
        String avatar   = (user.getProfile() != null) ? user.getProfile().getAvatar()   : null;

        AuthResponse.UserProfileDto userProfileDto = AuthResponse.UserProfileDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole().name())
                .fullName(fullName)
                .avatar(avatar)
                .username(user.getUsername())
                .build();

        return AuthResponse.builder()
                .token(newJwt)
                .refreshToken(newRefreshToken)
                .user(userProfileDto)
                .build();
    }

    // ── Logout ───────────────────────────────────────────────────────

    /**
     * Thu hồi refresh token — đảm bảo logout thật sự.
     * Ngay cả khi access token chưa hết hạn, token không thể được gia hạn.
     */
    @Transactional
    public void logout(String refreshToken) {
        userRepository.findByRefreshToken(refreshToken).ifPresent(user -> {
            user.setRefreshToken(null);
            user.setRefreshTokenExpiry(null);
            userRepository.save(user);
        });
        // Nếu không tìm thấy → không cần báo lỗi (idempotent)
    }
}
