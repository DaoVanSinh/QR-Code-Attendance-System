package com.qrcode.backend.service;

import com.qrcode.backend.dto.request.ChangePasswordRequest;
import com.qrcode.backend.dto.request.ProfileUpdateRequest;
import com.qrcode.backend.dto.response.ProfileResponse;
import com.qrcode.backend.entity.Profile;
import com.qrcode.backend.entity.User;
import com.qrcode.backend.entity.enums.Gender;
import com.qrcode.backend.repository.UserRepository;
import com.qrcode.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final EmailService emailService;

    @Transactional
    public void generateResetTokenAndSendEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng với email: " + email));

        String token = java.util.UUID.randomUUID().toString();
        user.setResetPasswordToken(token);
        user.setResetPasswordTokenExpiry(java.time.LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        String resetLink = "http://localhost:8080/common/reset-password.html?token=" + token;

        String subject = "Khôi phục mật khẩu - Hệ thống Điểm danh QR";
        String content = "Xin chào,\n\n"
                + "Bạn vừa yêu cầu khôi phục mật khẩu. Vui lòng nhấp vào liên kết dưới đây để đặt lại mật khẩu mới:\n"
                + resetLink + "\n\n"
                + "Liên kết này sẽ hết hạn sau 15 phút.\n"
                + "Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.\n\n"
                + "Trân trọng,\nQR Attendance Team";

        emailService.sendEmail(user.getEmail(), subject, content);
        auditService.logAction(user, "FORGOT_PASSWORD", "User requested password reset.");
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetPasswordToken(token)
                .orElseThrow(() -> new RuntimeException("Mã xác nhận không hợp lệ hoặc không tồn tại."));

        if (user.getResetPasswordTokenExpiry().isBefore(java.time.LocalDateTime.now())) {
            throw new RuntimeException("Mã xác nhận đã hết hạn.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        userRepository.save(user);

        auditService.logAction(user, "RESET_PASSWORD", "User successfully reset their password via token.");
    }

    @Transactional
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
                .username(user.getUsername())
                .fullName(profile != null ? profile.getFullName() : "")
                .phone(profile != null ? profile.getPhone() : "")
                .avatar(profile != null ? profile.getAvatar() : "")
                .role(user.getRole().name())
                .birthday(user.getBirthday())
                .gender(user.getGender() != null ? user.getGender().name() : null)
                .studentCode(profile != null ? profile.getStudentCode() : null)
                .department(profile != null ? profile.getDepartment() : null)
                .className(profile != null ? profile.getClassName() : null)
                .build();
    }

    @Transactional
    public void updateProfile(ProfileUpdateRequest request) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        // Reload user từ DB để tránh stale state
        User user = userRepository.findById(userDetails.getUser().getId())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản."));
        Profile profile = user.getProfile();

        // ── Cập nhật Email (có thể thay đổi) ─────────────────────
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equals(user.getEmail())) {
                if (userRepository.existsByEmailAndIdNot(newEmail, user.getId())) {
                    throw new IllegalArgumentException("Email này đã được sử dụng bởi tài khoản khác.");
                }
                user.setEmail(newEmail);
            }
        }

        // ── Cập nhật thông tin cá nhân (bảng user) ───────────────
        if (request.getBirthday() != null) {
            user.setBirthday(request.getBirthday());
        }
        if (request.getGender() != null && !request.getGender().trim().isEmpty()) {
            try {
                user.setGender(Gender.valueOf(request.getGender().trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Giá trị giới tính không hợp lệ: " + request.getGender());
            }
        }

        // ── Cập nhật thông tin Profile (bảng profile) ────────────
        if (profile != null) {
            if (request.getFullName() != null && !request.getFullName().trim().isEmpty()) {
                profile.setFullName(request.getFullName().trim());
            }
            if (request.getPhone() != null) {
                profile.setPhone(request.getPhone().trim());
            }
            if (request.getAvatar() != null) {
                profile.setAvatar(request.getAvatar().trim());
            }
            if (request.getDepartment() != null) {
                profile.setDepartment(request.getDepartment().trim());
            }
            if (request.getClassName() != null) {
                profile.setClassName(request.getClassName().trim());
            }
            // username & studentCode KHÔNG cập nhật ở đây — chỉ Admin mới có quyền
        }

        userRepository.save(user);
        auditService.logAction(user, "UPDATE_PROFILE", "User updated their personal profile.");
    }
}
