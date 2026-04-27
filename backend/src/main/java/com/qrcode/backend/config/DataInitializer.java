package com.qrcode.backend.config;

import com.qrcode.backend.entity.User;
import com.qrcode.backend.entity.Profile;
import com.qrcode.backend.entity.enums.Role;
import com.qrcode.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        final String ADMIN_EMAIL    = "admin@qrcode.com";
        final String ADMIN_PASSWORD = "Admin@2026";   // mật khẩu mặc định

        userRepository.findByEmail(ADMIN_EMAIL).ifPresentOrElse(
            admin -> {
                // Admin đã tồn tại — đảm bảo password vẫn hợp lệ (tự phục hồi nếu bị hỏng)
                if (!passwordEncoder.matches(ADMIN_PASSWORD, admin.getPassword())) {
                    admin.setPassword(passwordEncoder.encode(ADMIN_PASSWORD));
                    userRepository.save(admin);
                    System.out.println("====== [SYS] Admin password re-synced: " + ADMIN_EMAIL + " / " + ADMIN_PASSWORD + " ======");
                }
            },
            () -> {
                // Chưa có admin → tạo mới
                User adminUser = User.builder()
                        .email(ADMIN_EMAIL)
                        .password(passwordEncoder.encode(ADMIN_PASSWORD))
                        .role(Role.ADMIN)
                        .build();

                Profile adminProfile = Profile.builder()
                        .user(adminUser)
                        .fullName("Super Administrator")
                        .build();

                adminUser.setProfile(adminProfile);
                userRepository.save(adminUser);
                System.out.println("====== [SYS] Default Admin Created: " + ADMIN_EMAIL + " / " + ADMIN_PASSWORD + " ======");
            }
        );
    }
}
