package com.qrcode.backend.service;

import com.qrcode.backend.dto.request.CreateCourseRequest;
import com.qrcode.backend.dto.response.AdminSessionResponse;
import com.qrcode.backend.dto.response.CourseDetailResponse;
import com.qrcode.backend.dto.response.SemesterResponse;
import com.qrcode.backend.dto.response.UserSummaryResponse;
import com.qrcode.backend.dto.request.AdminCreateUserRequest;
import com.qrcode.backend.entity.*;
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

        Profile newProfile = Profile.builder()
                .user(newUser)
                .fullName(request.getFullName())
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

        // ── Resolve semester entity ────────────────────────────
        Semester semesterEntity = null;
        if (request.getSemesterId() != null) {
            semesterEntity = semesterRepository.findById(request.getSemesterId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ."));
        }

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

        // ── Auto-create Schedule record ────────────────────────
        if (request.getDayOfWeek() != null && request.getStartLesson() != null
                && request.getEndLesson() != null) {
            Schedule schedule = Schedule.builder()
                    .course(course)
                    .dayOfWeek(request.getDayOfWeek())
                    .startPeriod(request.getStartLesson())
                    .endPeriod(request.getEndLesson())
                    .room(request.getRoom() != null ? request.getRoom() : "TBD")
                    .isPrimary(true)
                    .build();
            scheduleRepository.save(schedule);
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

        // ── Resolve semester entity ────────────────────────────
        if (request.getSemesterId() != null) {
            Semester semesterEntity = semesterRepository.findById(request.getSemesterId())
                    .orElseThrow(() -> new RuntimeException("Không tìm thấy học kỳ."));
            course.setSemesterEntity(semesterEntity);
        }

        // ── Triple-Check Filter ────────────────────────────────
        scheduleService.runTripleCheck(
            course.getTeacher().getId(), course.getRoom(),
            course.getDayOfWeek(), course.getStartLesson(), course.getEndLesson(),
            course, id
        );

        course = courseRepository.save(course);

        // ── Update Schedule record ────────────────────────────
        if (request.getDayOfWeek() != null && request.getStartLesson() != null
                && request.getEndLesson() != null) {
            List<Schedule> existing = scheduleRepository.findByCourseId(id);
            Schedule primary = existing.stream()
                    .filter(s -> Boolean.TRUE.equals(s.getIsPrimary()))
                    .findFirst()
                    .orElse(null);

            if (primary != null) {
                // Check attendance trước khi sửa schedule
                long attCount = attendancesRepository.countBySessionCoursId(id);
                if (attCount > 0) {
                    // Chỉ cảnh báo, không chặn hoàn toàn
                    // Cho phép sửa nhưng giữ data integrity
                }
                primary.setDayOfWeek(request.getDayOfWeek());
                primary.setStartPeriod(request.getStartLesson());
                primary.setEndPeriod(request.getEndLesson());
                primary.setRoom(request.getRoom() != null ? request.getRoom() : primary.getRoom());
                scheduleRepository.save(primary);
            } else {
                Schedule schedule = Schedule.builder()
                        .course(course)
                        .dayOfWeek(request.getDayOfWeek())
                        .startPeriod(request.getStartLesson())
                        .endPeriod(request.getEndLesson())
                        .room(request.getRoom() != null ? request.getRoom() : "TBD")
                        .isPrimary(true)
                        .build();
                scheduleRepository.save(schedule);
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
                .build();
    }
}
