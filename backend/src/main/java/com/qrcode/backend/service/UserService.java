package com.qrcode.backend.service;

import com.qrcode.backend.dto.request.ChangePasswordRequest;
import com.qrcode.backend.dto.request.ProfileUpdateRequest;
import com.qrcode.backend.dto.response.ProfileResponse;
import com.qrcode.backend.entity.User;
import com.qrcode.backend.entity.Profile;
import com.qrcode.backend.repository.UserRepository;
import com.qrcode.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public void changePassword(ChangePasswordRequest request) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userDetails.getUser();

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu cũ không chính xác!");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        auditService.logAction(user, "CHANGE_PASSWORD", "User changed their login password.");
    }

    public ProfileResponse getProfile() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userDetails.getUser();
        Profile profile = user.getProfile();
        
        return ProfileResponse.builder()
                .email(user.getEmail())
                .fullName(profile != null ? profile.getFullName() : "No Default Name")
                .phone(profile != null ? profile.getPhone() : "")
                .avatar(profile != null ? profile.getAvatar() : "")
                .role(user.getRole().name())
                .build();
    }

    public void updateProfile(ProfileUpdateRequest request) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userDetails.getUser();
        Profile profile = user.getProfile();
        
        if (profile != null) {
            profile.setPhone(request.getPhone());
            profile.setAvatar(request.getAvatar());
            if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
                profile.setFullName(request.getFullName().trim());
            }
        }
        
        userRepository.save(user);
        auditService.logAction(user, "UPDATE_PROFILE", "User updated their personal profile (phone/avatar)");
    }
}
