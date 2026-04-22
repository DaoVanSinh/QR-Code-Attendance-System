package com.qrcode.backend.service;

import com.qrcode.backend.dto.request.LoginRequest;
import com.qrcode.backend.dto.response.AuthResponse;
import com.qrcode.backend.entity.User;
import com.qrcode.backend.repository.UserRepository;
import com.qrcode.backend.security.CustomUserDetails;
import com.qrcode.backend.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtUtils jwtUtils;
    private final AuditService auditService;

    public AuthResponse login(LoginRequest request) {
        String identifier = request.getIdentifier().trim();

        // Resolve identifier to email for authentication
        // If identifier contains '@', treat as email; otherwise treat as username
        String email;
        if (identifier.contains("@")) {
            email = identifier;
        } else {
            // Look up by username to get the email
            User foundUser = userRepository.findByUsername(identifier)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản với mã: " + identifier));
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

        String jwt = jwtUtils.generateToken(new CustomUserDetails(user));
        
        String fullName = (user.getProfile() != null) ? user.getProfile().getFullName() : null;
        String avatar = (user.getProfile() != null) ? user.getProfile().getAvatar() : null;

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
                .user(userProfileDto)
                .build();
    }
}
