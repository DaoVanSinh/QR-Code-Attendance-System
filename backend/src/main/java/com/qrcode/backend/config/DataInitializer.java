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
        if (userRepository.count() == 0) {
            User adminUser = User.builder()
                    .email("admin@qrcode.com")
                    .password(passwordEncoder.encode("admin"))
                    .role(Role.ADMIN)
                    .build();

            Profile adminProfile = Profile.builder()
                    .user(adminUser)
                    .fullName("Administrator Default")
                    .build();

            adminUser.setProfile(adminProfile);

            userRepository.save(adminUser);
            System.out.println("====== [SYS] Default Admin Account Created: admin@qrcode.com / admin ======");
        }
    }
}
