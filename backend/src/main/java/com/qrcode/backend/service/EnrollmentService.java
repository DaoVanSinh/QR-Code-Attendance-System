package com.qrcode.backend.service;

import com.qrcode.backend.dto.response.EnrolledCourseResponse;
import com.qrcode.backend.entity.Course;
import com.qrcode.backend.entity.Enrollment;
import com.qrcode.backend.entity.User;
import com.qrcode.backend.entity.enums.EnrollmentStatus;
import com.qrcode.backend.entity.enums.RegStatus;
import com.qrcode.backend.entity.enums.Role;
import com.qrcode.backend.exception.ResourceNotFoundException;
import com.qrcode.backend.repository.AttendancesRepository;
import com.qrcode.backend.repository.CourseRepository;
import com.qrcode.backend.repository.EnrollmentRepository;
import com.qrcode.backend.repository.ScheduleRepository;
import com.qrcode.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final ScheduleService scheduleService;
    private final ScheduleRepository scheduleRepository;
    private final AttendancesRepository attendancesRepository;
    private final com.qrcode.backend.repository.SessionRepository sessionRepository;

    /**
     * Lấy danh sách tất cả khóa học có thể đăng ký,
     * kèm theo trạng thái đã đăng ký hay chưa + thông tin sĩ số.
     */
    public List<EnrolledCourseResponse> getAllCoursesWithEnrollmentStatus() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        User student = userDetails.getUser();

        List<Course> allCourses = courseRepository.findAll();
        Set<Integer> enrolledCourseIds = enrollmentRepository.findByStudentId(student.getId())
                .stream()
                .filter(e -> e.getStatus() == EnrollmentStatus.ACTIVE)
                .map(e -> e.getCourse().getId())
                .collect(Collectors.toSet());

        return allCourses.stream()
                .map(c -> {
                    String teacherName = c.getTeacher().getProfile() != null
                            ? c.getTeacher().getProfile().getFullName()
                            : c.getTeacher().getEmail();
                    com.qrcode.backend.entity.Schedule secondary = scheduleRepository.findByCourseId(c.getId()).stream()
                            .filter(s -> Boolean.FALSE.equals(s.getIsPrimary()))
                            .findFirst().orElse(null);
                    return EnrolledCourseResponse.builder()
                            .courseId(c.getId())
                            .subjectCode(c.getSubject().getCode())
                            .subjectName(c.getSubject().getName())
                            .credits(c.getSubject().getCredits())
                            .className(c.getClasses().getName())
                            .teacherName(teacherName)
                            .semester(c.getSemester())
                            .dayOfWeek(c.getDayOfWeek())
                            .startLesson(c.getStartLesson())
                            .endLesson(c.getEndLesson())
                            .dayOfWeek2(secondary != null ? secondary.getDayOfWeek() : null)
                            .startLesson2(secondary != null ? secondary.getStartPeriod() : null)
                            .endLesson2(secondary != null ? secondary.getEndPeriod() : null)
                            .room(c.getRoom())
                            .startDate(c.getStartDate())
                            .endDate(c.getEndDate())
                            .enrolled(enrolledCourseIds.contains(c.getId()))
                            .maxSlots(c.getMaxSlots())
                            .currentSlots(c.getCurrentSlots())
                            .regStatus(c.getRegStatus() != null ? c.getRegStatus().name() : "OPEN")
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Sinh viên đăng ký học phần.
     * Sử dụng @Transactional + Pessimistic Locking để chống race condition.
     */
    @Transactional
    public void enroll(Integer courseId) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        User student = userDetails.getUser();

        if (student.getRole() != Role.STUDENT) {
            throw new IllegalArgumentException("Chỉ sinh viên mới có thể đăng ký học phần.");
        }

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khóa học."));

        // ── Check 0: Lớp đã đóng đăng ký? ─────────────────────
        if (course.getRegStatus() == RegStatus.CLOSED) {
            throw new IllegalArgumentException("Lớp học phần đã đóng đăng ký.");
        }

        // ── Check 1: Đã đăng ký chưa? ──────────────────────────
        if (enrollmentRepository.existsByCourseIdAndStudentId(courseId, student.getId())) {
            throw new IllegalArgumentException("Bạn đã đăng ký học phần này rồi.");
        }

        // ── Check 2: Kiểm tra sĩ số (Pessimistic Lock) ─────────
        // SELECT ... FOR UPDATE để chặn concurrent enrollment
        List<Enrollment> lockedEnrollments = enrollmentRepository.findByCourseIdAndStatusForUpdate(
            courseId, EnrollmentStatus.ACTIVE
        );
        if (lockedEnrollments.size() >= course.getMaxSlots()) {
            throw new IllegalArgumentException(
                String.format("Lớp học phần đã đủ sĩ số (%d/%d). Không thể đăng ký thêm.",
                    lockedEnrollments.size(), course.getMaxSlots())
            );
        }

        // ── Check 3: Kiểm tra trùng lịch cá nhân ───────────────
        String conflict = scheduleService.checkStudentTimeConflict(student.getId(), courseId);
        if (conflict != null) {
            throw new IllegalArgumentException(conflict);
        }

        Enrollment enrollment = Enrollment.builder()
                .course(course)
                .student(student)
                .build();

        enrollmentRepository.save(enrollment);
    }

    /**
     * Sinh viên hủy đăng ký học phần.
     * Kiểm tra attendance trước khi cho hủy (Data Integrity).
     */
    @Transactional
    public void unenroll(Integer courseId) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        User student = userDetails.getUser();

        if (!enrollmentRepository.existsByCourseIdAndStudentId(courseId, student.getId())) {
            throw new ResourceNotFoundException("Bạn chưa đăng ký học phần này.");
        }

        // ── Check A: Course đã có session điểm danh nào chưa? ──────────
        // Nếu đã có session → lớp đã vào học → không cho hủy
        if (sessionRepository.existsByCourseId(courseId)) {
            throw new IllegalArgumentException(
                "Không thể hủy đăng ký! Học phần này đã bắt đầu điểm danh (lớp đã vào học). " +
                "Vui lòng liên hệ Giảng viên hoặc Admin nếu cần hỗ trợ."
            );
        }

        // ── Check B: Sinh viên đã có dữ liệu điểm danh chưa? ───────────
        if (attendancesRepository.existsBySessionCourseIdAndStudentId(courseId, student.getId())) {
            throw new IllegalArgumentException(
                "Không thể hủy đăng ký! Bạn đã có dữ liệu điểm danh trong học phần này. " +
                "Vui lòng liên hệ Admin nếu cần hỗ trợ."
            );
        }

        enrollmentRepository.deleteByCourseIdAndStudentId(courseId, student.getId());
    }

    /**
     * Kiểm tra sinh viên có đăng ký khóa học này không.
     */
    public boolean isEnrolled(Integer courseId, Integer studentId) {
        return enrollmentRepository.existsByCourseIdAndStudentId(courseId, studentId);
    }
}

