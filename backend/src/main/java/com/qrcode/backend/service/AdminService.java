package com.qrcode.backend.service;

import com.qrcode.backend.dto.request.CreateCourseRequest;
import com.qrcode.backend.dto.response.AdminSessionResponse;
import com.qrcode.backend.dto.response.CourseDetailResponse;
import com.qrcode.backend.dto.response.SemesterResponse;
import com.qrcode.backend.dto.response.UserSummaryResponse;
import com.qrcode.backend.dto.request.AdminCreateUserRequest;
import com.qrcode.backend.entity.*;
import com.qrcode.backend.entity.enums.Gender;
import com.qrcode.backend.entity.enums.Role;
import com.qrcode.backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SubjectRepository subjectRepository;
    private final ClassesRepository classesRepository;
    private final CourseRepository courseRepository;
    private final SessionRepository sessionRepository;
    private final AttendancesRepository attendancesRepository;
    private final SemesterRepository semesterRepository;
    private final ScheduleRepository scheduleRepository;
    private final ScheduleService scheduleService;
    private final EnrollmentRepository enrollmentRepository;

    @Transactional
    public void createUser(AdminCreateUserRequest request) {
        // Check duplicate email
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email đã tồn tại trong hệ thống.");
        }

        // Validate username (mã sinh viên) for STUDENT role
        String username = null;
        if (request.getRole() == Role.STUDENT) {
            if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
                throw new IllegalArgumentException("Mã sinh viên là bắt buộc cho tài khoản Sinh Viên.");
            }
            username = request.getUsername().trim();
            if (userRepository.existsByUsername(username)) {
                throw new IllegalArgumentException("Mã sinh viên đã tồn tại trong hệ thống.");
            }
        } else if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            // Teacher/Admin cũng có thể có username (optional)
            username = request.getUsername().trim();
            if (userRepository.existsByUsername(username)) {
                throw new IllegalArgumentException("Username đã tồn tại trong hệ thống.");
            }
        }

        User newUser = User.builder()
                .email(request.getEmail())
                .username(username)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .build();

        // Xử lý birthday
        if (request.getBirthday() != null) {
            newUser.setBirthday(request.getBirthday());
        }
        // Xử lý gender
        if (request.getGender() != null && !request.getGender().trim().isEmpty()) {
            try {
                newUser.setGender(Gender.valueOf(request.getGender().trim().toUpperCase()));
            } catch (IllegalArgumentException ignored) { /* bỏ qua nếu giá trị không hợp lệ */ }
        }

        Profile newProfile = Profile.builder()
                .user(newUser)
                .fullName(request.getFullName())
                .studentCode(request.getRole() == Role.STUDENT ? request.getStudentCode() : null)
                .department(request.getDepartment())
                .className(request.getClassName())
                .build();

        newUser.setProfile(newProfile);
        userRepository.save(newUser);
    }

    @Transactional
    public void deleteUser(Integer id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.getEmail().equalsIgnoreCase("admin@qrcode.com")) {
            throw new RuntimeException("Cannot delete the default system administrator.");
        }

        userRepository.delete(user);
    }

    @Transactional
    public void updateUser(Integer id, AdminCreateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản."));

        // Email
        if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            if (!newEmail.equals(user.getEmail())) {
                if (userRepository.existsByEmailAndIdNot(newEmail, user.getId())) {
                    throw new IllegalArgumentException("Email này đã được sử dụng bởi tài khoản khác.");
                }
                user.setEmail(newEmail);
            }
        }

        // Password (optional)
        if (request.getPassword() != null && !request.getPassword().trim().isEmpty()) {
            user.setPassword(passwordEncoder.encode(request.getPassword().trim()));
        }

        // Birthday / Gender
        if (request.getBirthday() != null) user.setBirthday(request.getBirthday());
        if (request.getGender() != null && !request.getGender().trim().isEmpty()) {
            try { user.setGender(Gender.valueOf(request.getGender().trim().toUpperCase())); }
            catch (IllegalArgumentException ignored) {}
        }

        // Profile
        Profile profile = user.getProfile();
        if (profile != null) {
            if (request.getFullName() != null && !request.getFullName().trim().isEmpty())
                profile.setFullName(request.getFullName().trim());
            if (request.getDepartment() != null) profile.setDepartment(request.getDepartment().trim());
            if (request.getClassName()  != null) profile.setClassName(request.getClassName().trim());
        }

        // Username (Mã SV — chỉ dành cho STUDENT)
        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()
                && user.getRole() == Role.STUDENT) {
            String newUsername = request.getUsername().trim();
            if (!newUsername.equals(user.getUsername())) {
                if (userRepository.existsByUsernameAndIdNot(newUsername, user.getId())) {
                    throw new IllegalArgumentException("Mã sinh viên này đã được sử dụng bởi tài khoản khác.");
                }
                user.setUsername(newUsername);
            }
        }

        userRepository.save(user);

    }

    public List<UserSummaryResponse> getTeachers() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.TEACHER)
                .map(u -> UserSummaryResponse.builder()
                        .id(u.getId())
                        .email(u.getEmail())
                        .role(u.getRole().name())
                        .fullName(u.getProfile() != null ? u.getProfile().getFullName() : "")
                        .createdAt(u.getCreatedAt() != null ? u.getCreatedAt().toString() : "")
                        .build())
                .collect(Collectors.toList());
    }

    public List<Classes> getAllClasses() {
        return classesRepository.findAll();
    }

    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }

    @Transactional
    public void deleteSubject(Integer id) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy môn học."));

        // Kiểm tra có lớp học phần nào đang dùng môn này không
        long courseCount = courseRepository.countBySubjectId(id);
        if (courseCount > 0) {
            // Kiểm tra có sinh viên đã đăng ký vào bất kỳ lớp nào của môn này không
            List<Course> courses = courseRepository.findBySubjectId(id);
            long enrollCount = courses.stream()
                    .mapToLong(c -> enrollmentRepository.countByCourseIdAndStatus(
                            c.getId(), com.qrcode.backend.entity.enums.EnrollmentStatus.ACTIVE))
                    .sum();
            if (enrollCount > 0) {
                throw new RuntimeException(
                    "Môn học đã có " + enrollCount + " sinh viên đang đăng ký. Không thể xóa.");
            }
            throw new RuntimeException(
                "Không thể xóa môn học đang được sử dụng trong " + courseCount + " lớp học phần.");
        }
        subjectRepository.delete(subject);
    }

    @Transactional
    public Subject updateSubject(Integer id, String code, String name, Integer credits) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy môn học."));
        if (code != null && !code.trim().isEmpty()) subject.setCode(code.trim().toUpperCase());
        if (name != null && !name.trim().isEmpty()) subject.setName(name.trim());
        if (credits != null) subject.setCredits(credits);
        return subjectRepository.save(subject);
    }

    @Transactional
    public CourseDetailResponse createCourse(CreateCourseRequest request) {
        Subject subject = subjectRepository.findByCode(request.getSubjectCode())
                .orElseGet(() -> {
                    Subject newSub = Subject.builder()
                            .code(request.getSubjectCode())
                            .name(request.getSubjectName())
                            .credits(request.getCredits() != null ? request.getCredits() : 3)
                            .build();
                    return subjectRepository.save(newSub);
                });

        User teacher = userRepository.findById(request.getTeacherId())
                .orElseThrow(() -> new RuntimeException("Teacher not found"));
        
        Classes classes = classesRepository.findByName(request.getClassName())
                .orElseGet(() -> {
                    String cleanCode = request.getClassName().replaceAll("[^a-zA-Z0-9_-]", "").toUpperCase();
                    if (cleanCode.isEmpty()) cleanCode = "CLASS-" + System.currentTimeMillis();
                    String uniqueCode = cleanCode + "-" + (int)(Math.random() * 1000);

                    Classes newClass = Classes.builder()
                            .name(request.getClassName())
                            .code(uniqueCode)
                            .subject(subject)
                            .build();
                    return classesRepository.save(newClass);
                });

        if (teacher.getRole() != Role.TEACHER) {
            throw new RuntimeException("User is not a teacher.");
        }

        // ── Resolve semester entity: semesterId > label string ──
        Semester semesterEntity = resolveSemesterFromLabel(
                request.getSemesterId(), request.getSemester());

        Course course = Course.builder()
                .subject(subject)
                .teacher(teacher)
                .classes(classes)
                .semester(request.getSemester())
                .semesterEntity(semesterEntity)
                .maxSlots(request.getMaxSlots() != null ? request.getMaxSlots() : 50)
                .room(request.getRoom())
                .dayOfWeek(request.getDayOfWeek())
                .startLesson(request.getStartLesson())
                .endLesson(request.getEndLesson())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .build();

        // ── Triple-Check Filter (Bộ lọc 3 lớp) ───────────────
        scheduleService.runTripleCheck(
            teacher.getId(), request.getRoom(),
            request.getDayOfWeek(), request.getStartLesson(), request.getEndLesson(),
            course, null
        );

        course = courseRepository.save(course);

        // ── Auto-create Schedule buổi 1 ────────────────────────
        if (request.getDayOfWeek() != null && request.getStartLesson() != null
                && request.getEndLesson() != null) {
            scheduleRepository.save(Schedule.builder()
                    .course(course)
                    .dayOfWeek(request.getDayOfWeek())
                    .startPeriod(request.getStartLesson())
                    .endPeriod(request.getEndLesson())
                    .room(request.getRoom() != null ? request.getRoom() : "TBD")
                    .isPrimary(true)
                    .build());
        }

        // ── Auto-create Schedule buổi 2 (2TC / 4TC) ───────────
        if (request.getDayOfWeek2() != null && request.getStartLesson2() != null
                && request.getEndLesson2() != null) {
            scheduleRepository.save(Schedule.builder()
                    .course(course)
                    .dayOfWeek(request.getDayOfWeek2())
                    .startPeriod(request.getStartLesson2())
                    .endPeriod(request.getEndLesson2())
                    .room(request.getRoom() != null ? request.getRoom() : "TBD")
                    .isPrimary(false)
                    .build());
        }

        return toCourseDetailResponse(course);
    }

    @Transactional
    public CourseDetailResponse updateCourse(Integer id, CreateCourseRequest request) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy môn học"));

        if (request.getTeacherId() != null) {
            User teacher = userRepository.findById(request.getTeacherId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));
            if (teacher.getRole() != Role.TEACHER) {
                throw new RuntimeException("User is not a teacher.");
            }
            course.setTeacher(teacher);
        }

        if (request.getSubjectCode() != null && !request.getSubjectCode().isEmpty()) {
            Subject subject = subjectRepository.findByCode(request.getSubjectCode())
                    .orElseGet(() -> {
                        Subject newSub = Subject.builder()
                                .code(request.getSubjectCode())
                                .name(request.getSubjectName())
                                .credits(request.getCredits() != null ? request.getCredits() : 3)
                                .build();
                        return subjectRepository.save(newSub);
                    });
            course.setSubject(subject);
        }

        if (request.getClassName() != null && !request.getClassName().isEmpty()) {
            final Subject currentSubject = course.getSubject();
            Classes classes = classesRepository.findByName(request.getClassName())
                    .orElseGet(() -> {
                        String cleanCode = request.getClassName().replaceAll("[^a-zA-Z0-9_-]", "").toUpperCase();
                        if (cleanCode.isEmpty()) cleanCode = "CLASS-" + System.currentTimeMillis();
                        String uniqueCode = cleanCode + "-" + (int)(Math.random() * 1000);

                        Classes newClass = Classes.builder()
                                .name(request.getClassName())
                                .code(uniqueCode)
                                .subject(currentSubject)
                                .build();
                        return classesRepository.save(newClass);
                    });
            course.setClasses(classes);
        }

        if (request.getSemester() != null) course.setSemester(request.getSemester());
        if (request.getRoom() != null) course.setRoom(request.getRoom());
        if (request.getDayOfWeek() != null) course.setDayOfWeek(request.getDayOfWeek());
        if (request.getStartLesson() != null) course.setStartLesson(request.getStartLesson());
        if (request.getEndLesson() != null) course.setEndLesson(request.getEndLesson());
        if (request.getStartDate() != null) course.setStartDate(request.getStartDate());
        if (request.getEndDate() != null) course.setEndDate(request.getEndDate());
        if (request.getMaxSlots() != null) course.setMaxSlots(request.getMaxSlots());

        // ── Resolve semester entity: semesterId > label string ──
        if (course.getSemesterEntity() == null || request.getSemesterId() != null
                || request.getSemester() != null) {
            Semester resolved = resolveSemesterFromLabel(
                    request.getSemesterId(),
                    request.getSemester() != null ? request.getSemester() : course.getSemester());
            if (resolved != null) course.setSemesterEntity(resolved);
        }

        // ── Triple-Check Filter ────────────────────────────────
        scheduleService.runTripleCheck(
            course.getTeacher().getId(), course.getRoom(),
            course.getDayOfWeek(), course.getStartLesson(), course.getEndLesson(),
            course, id
        );

        course = courseRepository.save(course);

        // ── Sync Schedule buổi 1 ─────────────────────────────
        if (request.getDayOfWeek() != null && request.getStartLesson() != null
                && request.getEndLesson() != null) {
            List<Schedule> existing = scheduleRepository.findByCourseId(id);
            Schedule primary = existing.stream()
                    .filter(s -> Boolean.TRUE.equals(s.getIsPrimary()))
                    .findFirst().orElse(null);
            if (primary != null) {
                primary.setDayOfWeek(request.getDayOfWeek());
                primary.setStartPeriod(request.getStartLesson());
                primary.setEndPeriod(request.getEndLesson());
                primary.setRoom(request.getRoom() != null ? request.getRoom() : primary.getRoom());
                scheduleRepository.save(primary);
            } else {
                scheduleRepository.save(Schedule.builder()
                        .course(course).dayOfWeek(request.getDayOfWeek())
                        .startPeriod(request.getStartLesson()).endPeriod(request.getEndLesson())
                        .room(request.getRoom() != null ? request.getRoom() : "TBD")
                        .isPrimary(true).build());
            }
        }

        // ── Sync Schedule buổi 2 (2TC / 4TC) ────────────────
        if (request.getDayOfWeek2() != null && request.getStartLesson2() != null
                && request.getEndLesson2() != null) {
            List<Schedule> existing = scheduleRepository.findByCourseId(id);
            Schedule secondary = existing.stream()
                    .filter(s -> Boolean.FALSE.equals(s.getIsPrimary()))
                    .findFirst().orElse(null);
            if (secondary != null) {
                secondary.setDayOfWeek(request.getDayOfWeek2());
                secondary.setStartPeriod(request.getStartLesson2());
                secondary.setEndPeriod(request.getEndLesson2());
                secondary.setRoom(request.getRoom() != null ? request.getRoom() : secondary.getRoom());
                scheduleRepository.save(secondary);
            } else {
                scheduleRepository.save(Schedule.builder()
                        .course(course).dayOfWeek(request.getDayOfWeek2())
                        .startPeriod(request.getStartLesson2()).endPeriod(request.getEndLesson2())
                        .room(request.getRoom() != null ? request.getRoom() : "TBD")
                        .isPrimary(false).build());
            }
        }

        return toCourseDetailResponse(course);
    }

    /**
     * Xóa course — kiểm tra Data Integrity trước khi xóa.
     * Nếu đã có attendance → không cho xóa.
     */
    @Transactional
    public void deleteCourse(Integer id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học phần."));

        long attCount = attendancesRepository.countBySessionCoursId(id);
        if (attCount > 0) {
            throw new RuntimeException(
                "Không thể xóa! Học phần đã có " + attCount + " bản ghi điểm danh. Vui lòng hủy các phiên điểm danh trước."
            );
        }

        // Schedules sẽ tự xóa nhờ ON DELETE CASCADE trong DB
        courseRepository.delete(course);
    }

    public List<CourseDetailResponse> getAllCourses() {
        return courseRepository.findAll().stream()
                .map(this::toCourseDetailResponse)
                .collect(Collectors.toList());
    }

    public List<SemesterResponse> getAllSemesters() {
        return semesterRepository.findAllByOrderBySchoolYearDescNameAsc().stream()
                .map(this::toSemesterResponse)
                .collect(Collectors.toList());
    }

    private SemesterResponse toSemesterResponse(Semester s) {
        // Tên HK tiếng Việt
        String nameFull = switch (s.getName()) {
            case "HK1" -> "Học kỳ 1";
            case "HK2" -> "Học kỳ 2";
            case "HK3" -> "Học kỳ hè";
            default -> s.getName();
        };
        // Label ngắn hiển thị trong dropdown
        String label = s.getName() + " — " + s.getSchoolYear();
        // Label đầy đủ
        String labelFull = nameFull + " — " + s.getSchoolYear();
        // Tính số tuần
        long totalWeeks = 0;
        if (s.getStartDate() != null && s.getEndDate() != null) {
            totalWeeks = ChronoUnit.WEEKS.between(s.getStartDate(), s.getEndDate());
        }
        return SemesterResponse.builder()
                .id(s.getId())
                .name(s.getName())
                .schoolYear(s.getSchoolYear())
                .label(label)
                .labelFull(labelFull)
                .nameFull(nameFull)
                .startDate(s.getStartDate())
                .endDate(s.getEndDate())
                .isActive(s.getIsActive())
                .totalWeeks((int) totalWeeks)
                .build();
    }

    public List<AdminSessionResponse> getAllSessions() {
        LocalDateTime now = LocalDateTime.now();
        return sessionRepository.findAll().stream()
                .map(s -> {
                    String teacherName = s.getCourse().getTeacher().getProfile() != null
                            ? s.getCourse().getTeacher().getProfile().getFullName()
                            : s.getCourse().getTeacher().getEmail();
                    return AdminSessionResponse.builder()
                            .id(s.getId())
                            .courseId(s.getCourse().getId())
                            .subjectCode(s.getCourse().getSubject().getCode())
                            .subjectName(s.getCourse().getSubject().getName())
                            .className(s.getCourse().getClasses().getName())
                            .teacherName(teacherName)
                            .teacherEmail(s.getCourse().getTeacher().getEmail())
                            .semester(s.getCourse().getSemester())
                            .startTime(s.getStartTime())
                            .endTime(s.getEndTime())
                            .expiredAt(s.getExpiredAt())
                            .expired(s.getExpiredAt() != null && s.getExpiredAt().isBefore(now))
                            .attendanceCount(attendancesRepository.countBySessionId(s.getId()))
                            .build();
                })
                .collect(Collectors.toList());
    }

    private CourseDetailResponse toCourseDetailResponse(Course course) {
        String teacherName = course.getTeacher().getProfile() != null
                ? course.getTeacher().getProfile().getFullName()
                : course.getTeacher().getEmail();

        // Lấy thông tin buổi 2 từ schedules
        List<Schedule> schedules = scheduleRepository.findByCourseId(course.getId());
        Schedule secondary = schedules.stream()
                .filter(s -> Boolean.FALSE.equals(s.getIsPrimary()))
                .findFirst().orElse(null);

        return CourseDetailResponse.builder()
                .id(course.getId())
                .subjectName(course.getSubject().getName())
                .subjectCode(course.getSubject().getCode())
                .credits(course.getSubject().getCredits())
                .className(course.getClasses().getName())
                .classCode(course.getClasses().getCode())
                .teacherId(course.getTeacher().getId())
                .teacherName(teacherName)
                .teacherEmail(course.getTeacher().getEmail())
                .semester(course.getSemester())
                .semesterId(course.getSemesterEntity() != null ? course.getSemesterEntity().getId() : null)
                .room(course.getRoom())
                .dayOfWeek(course.getDayOfWeek())
                .startLesson(course.getStartLesson())
                .endLesson(course.getEndLesson())
                .startDate(course.getStartDate())
                .endDate(course.getEndDate())
                .maxSlots(course.getMaxSlots())
                .currentSlots(course.getCurrentSlots())
                .dayOfWeek2(secondary != null ? secondary.getDayOfWeek() : null)
                .startLesson2(secondary != null ? secondary.getStartPeriod() : null)
                .endLesson2(secondary != null ? secondary.getEndPeriod() : null)
                .build();
    }

    /**
     * Resolve Semester entity: ưu tiên semesterId, fallback về parse label "HK1 — 2025-2026".
     */
    private Semester resolveSemesterFromLabel(Integer semesterId, String semesterLabel) {
        if (semesterId != null) {
            return semesterRepository.findById(semesterId).orElse(null);
        }
        if (semesterLabel != null && semesterLabel.contains(" — ")) {
            String[] parts = semesterLabel.split(" — ", 2);
            if (parts.length == 2) {
                return semesterRepository
                        .findByNameAndSchoolYear(parts[0].trim(), parts[1].trim())
                        .orElse(null);
            }
        }
        return null;
    }

    /**
     * Backfill: tạo Schedule records cho Course cũ chưa có + link semesterEntity.
     * Gọi 1 lần qua endpoint POST /api/admin/courses/sync-schedules.
     */
    @Transactional
    public Map<String, Object> syncAllSchedules() {
        List<Course> courses = courseRepository.findAll();
        int createdSchedules = 0;
        int linkedSemesters = 0;

        for (Course course : courses) {
            // 1. Link semesterEntity nếu đang null
            if (course.getSemesterEntity() == null && course.getSemester() != null) {
                Semester sem = resolveSemesterFromLabel(null, course.getSemester());
                if (sem != null) {
                    course.setSemesterEntity(sem);
                    courseRepository.save(course);
                    linkedSemesters++;
                }
            }

            // 2. Tạo Schedule buổi 1 nếu chưa có
            List<Schedule> existing = scheduleRepository.findByCourseId(course.getId());
            boolean hasPrimary = existing.stream().anyMatch(s -> Boolean.TRUE.equals(s.getIsPrimary()));
            if (!hasPrimary && course.getDayOfWeek() != null
                    && course.getStartLesson() != null && course.getEndLesson() != null) {
                scheduleRepository.save(Schedule.builder()
                        .course(course)
                        .dayOfWeek(course.getDayOfWeek())
                        .startPeriod(course.getStartLesson())
                        .endPeriod(course.getEndLesson())
                        .room(course.getRoom() != null ? course.getRoom() : "TBD")
                        .isPrimary(true)
                        .build());
                createdSchedules++;
            }
        }

        return Map.of(
            "totalCourses", courses.size(),
            "schedulesCreated", createdSchedules,
            "semestersLinked", linkedSemesters
        );
    }
}
