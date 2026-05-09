package com.qrcode.backend.config;

import com.qrcode.backend.entity.Semester;
import com.qrcode.backend.entity.User;
import com.qrcode.backend.entity.Profile;
import com.qrcode.backend.entity.enums.Role;
import com.qrcode.backend.repository.SemesterRepository;
import com.qrcode.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final SemesterRepository semesterRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        seedAdmin();
        seedSemesters();
    }

    private void seedAdmin() {
        final String ADMIN_EMAIL = "admin@qrcode.com";
        final String ADMIN_PASSWORD = "Admin@2026"; // mật khẩu mặc định

        userRepository.findByEmail(ADMIN_EMAIL).ifPresentOrElse(
                admin -> {
                    // Admin đã tồn tại — đảm bảo password vẫn hợp lệ (tự phục hồi nếu bị hỏng)
                    if (!passwordEncoder.matches(ADMIN_PASSWORD, admin.getPassword())) {
                        admin.setPassword(passwordEncoder.encode(ADMIN_PASSWORD));
                        userRepository.save(admin);
                        System.out.println("====== [SYS] Admin password re-synced: " + ADMIN_EMAIL + " / "
                                + ADMIN_PASSWORD + " ======");
                    }
                },
                () -> {
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
                    System.out.println(
                            "====== [SYS] Default Admin Created: " + ADMIN_EMAIL + " / " + ADMIN_PASSWORD + " ======");
                });
    }

    /**
     * Tự động seed bảng semesters nếu trống (do TRUNCATE / reset DB).
     * Flyway chỉ chạy INSERT 1 lần, nên cần logic phục hồi tại runtime.
     */
    private void seedSemesters() {
        if (semesterRepository.count() > 0) return;

        System.out.println("====== [SYS] Bảng semesters trống — đang seed dữ liệu mặc định... ======");

        LocalDate today = LocalDate.now();

        List<Semester> semesters = List.of(
                Semester.builder().name("HK1").schoolYear("2024-2025")
                        .startDate(LocalDate.of(2024, 9, 2)).endDate(LocalDate.of(2025, 1, 17))
                        .isActive(false).build(),
                Semester.builder().name("HK2").schoolYear("2024-2025")
                        .startDate(LocalDate.of(2025, 1, 20)).endDate(LocalDate.of(2025, 6, 6))
                        .isActive(false).build(),
                Semester.builder().name("HK3").schoolYear("2024-2025")
                        .startDate(LocalDate.of(2025, 6, 16)).endDate(LocalDate.of(2025, 8, 22))
                        .isActive(false).build(),
                Semester.builder().name("HK1").schoolYear("2025-2026")
                        .startDate(LocalDate.of(2025, 9, 1)).endDate(LocalDate.of(2026, 1, 16))
                        .isActive(false).build(),
                Semester.builder().name("HK2").schoolYear("2025-2026")
                        .startDate(LocalDate.of(2026, 1, 19)).endDate(LocalDate.of(2026, 6, 5))
                        .isActive(false).build(),
                Semester.builder().name("HK3").schoolYear("2025-2026")
                        .startDate(LocalDate.of(2026, 6, 15)).endDate(LocalDate.of(2026, 8, 21))
                        .isActive(false).build()
        );

        // Auto-detect học kỳ hiện tại dựa trên ngày hôm nay
        for (Semester s : semesters) {
            if (!today.isBefore(s.getStartDate()) && !today.isAfter(s.getEndDate())) {
                s.setIsActive(true);
                break;
            }
        }

        // Nếu không match ngày nào → active cái gần nhất (chưa kết thúc)
        boolean hasActive = semesters.stream().anyMatch(Semester::getIsActive);
        if (!hasActive) {
            semesters.stream()
                    .filter(s -> s.getEndDate().isAfter(today))
                    .findFirst()
                    .ifPresent(s -> s.setIsActive(true));
        }

        semesterRepository.saveAll(semesters);
        System.out.println("====== [SYS] Đã seed " + semesters.size() + " học kỳ thành công! ======");
    }
}

