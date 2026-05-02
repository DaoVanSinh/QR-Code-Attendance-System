package com.qrcode.backend.service;

import com.qrcode.backend.dto.export.AttendanceCourseInfo;
import com.qrcode.backend.dto.export.AttendanceReportDTO;
import com.qrcode.backend.dto.export.StudentAttendanceRow;
import com.qrcode.backend.dto.request.CreateSessionRequest;
import com.qrcode.backend.dto.response.AttendanceRecordResponse;
import com.qrcode.backend.dto.response.CourseResponse;
import com.qrcode.backend.dto.response.ManualAttendanceStudentResponse;
import com.qrcode.backend.dto.response.SessionResponse;
import com.qrcode.backend.dto.response.SessionSummaryResponse;
import com.qrcode.backend.entity.Attendances;
import com.qrcode.backend.entity.Course;
import com.qrcode.backend.entity.Enrollment;
import com.qrcode.backend.entity.enums.EnrollmentStatus;
import com.qrcode.backend.entity.Session;
import com.qrcode.backend.entity.User;
import com.qrcode.backend.exception.ResourceNotFoundException;
import com.qrcode.backend.repository.AttendancesRepository;
import com.qrcode.backend.repository.CourseRepository;
import com.qrcode.backend.repository.EnrollmentRepository;
import com.qrcode.backend.repository.ScheduleRepository;
import com.qrcode.backend.repository.SessionRepository;
import com.qrcode.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SessionService {

    private final SessionRepository sessionRepository;
    private final CourseRepository courseRepository;
    private final AttendancesRepository attendancesRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final ScheduleRepository scheduleRepository;
    private final AuditService auditService;
    private final ExportService exportService;

    public List<CourseResponse> getMyCourses() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User teacher = userDetails.getUser();

        return courseRepository.findByTeacherId(teacher.getId()).stream()
                .map(course -> {
                    com.qrcode.backend.entity.Schedule secondary = scheduleRepository.findByCourseId(course.getId()).stream()
                            .filter(s -> Boolean.FALSE.equals(s.getIsPrimary()))
                            .findFirst().orElse(null);
                    return CourseResponse.builder()
                        .id(course.getId())
                        .subjectName(course.getSubject().getName())
                        .subjectCode(course.getSubject().getCode())
                        .credits(course.getSubject().getCredits())
                        .className(course.getClasses().getName())
                        .semester(course.getSemester())
                        .dayOfWeek(course.getDayOfWeek())
                        .startLesson(course.getStartLesson())
                        .endLesson(course.getEndLesson())
                        .dayOfWeek2(secondary != null ? secondary.getDayOfWeek() : null)
                        .startLesson2(secondary != null ? secondary.getStartPeriod() : null)
                        .endLesson2(secondary != null ? secondary.getEndPeriod() : null)
                        .room(course.getRoom())
                        .startDate(course.getStartDate())
                        .endDate(course.getEndDate())
                        .build();
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public SessionResponse createSession(Integer courseId, CreateSessionRequest request) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User teacher = userDetails.getUser();

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new AccessDeniedException("You are not the assigned teacher of this course.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime endTime = now.plusMinutes(request.getDurationMinutes());
        LocalDateTime expiredAt = now.plusMinutes(request.getDurationMinutes());
        String qrToken = UUID.randomUUID().toString();

        Session session = Session.builder()
                .course(course)
                .startTime(now)
                .endTime(endTime)
                .qrCode(qrToken)
                .expiredAt(expiredAt)
                .build();

        session = sessionRepository.save(session);

        auditService.logAction(teacher, "SESSION_CREATED", "Teacher created session " + session.getId() + " for course " + courseId);

        return SessionResponse.builder()
                .id(session.getId())
                .courseId(course.getId())
                .qrCode(session.getQrCode())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .expiredAt(session.getExpiredAt())
                .subjectName(course.getSubject().getName())
                .subjectCode(course.getSubject().getCode())
                .className(course.getClasses().getName())
                .semester(course.getSemester())
                .room(course.getRoom())
                .dayOfWeek(course.getDayOfWeek())
                .startLesson(course.getStartLesson())
                .endLesson(course.getEndLesson())
                .teacherName(course.getTeacher().getProfile() != null
                    ? course.getTeacher().getProfile().getFullName()
                    : course.getTeacher().getEmail())
                .build();
    }

    public List<SessionSummaryResponse> getCourseSessions(Integer courseId) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User teacher = userDetails.getUser();

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new AccessDeniedException("You are not authorized to view this course.");
        }

        List<Session> sessions = sessionRepository.findByCourseIdOrderByStartTimeDesc(courseId);
        LocalDateTime now = LocalDateTime.now();

        return sessions.stream()
                .map(s -> SessionSummaryResponse.builder()
                        .id(s.getId())
                        .courseId(courseId)
                        .startTime(s.getStartTime())
                        .endTime(s.getEndTime())
                        .expiredAt(s.getExpiredAt())
                        .expired(s.getExpiredAt() != null && s.getExpiredAt().isBefore(now))
                        .attendanceCount(attendancesRepository.countBySessionId(s.getId()))
                        .build())
                .collect(Collectors.toList());
    }

    public List<AttendanceRecordResponse> getSessionAttendances(Integer sessionId) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User teacher = userDetails.getUser();

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getCourse().getTeacher().getId().equals(teacher.getId())) {
            throw new AccessDeniedException("You are not authorized for this session.");
        }

        List<Attendances> records = attendancesRepository.findBySessionId(sessionId);

        return records.stream()
                .map(att -> AttendanceRecordResponse.builder()
                        .studentId(att.getStudent().getId())
                        .studentName(att.getStudent().getProfile() != null ? att.getStudent().getProfile().getFullName() : "No Profile")
                        .studentEmail(att.getStudent().getEmail())
                        .checkInTime(att.getCheckInTime())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public SessionResponse refreshQrCode(Integer sessionId) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User teacher = userDetails.getUser();

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getCourse().getTeacher().getId().equals(teacher.getId())) {
            throw new AccessDeniedException("You are not authorized for this session.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (session.getExpiredAt() != null && session.getExpiredAt().isBefore(now)) {
            throw new IllegalArgumentException("Cannot refresh QR code for an expired session.");
        }

        // Move current qr to previous, and generate a new one
        session.setPreviousQrCode(session.getQrCode());
        session.setQrCode(UUID.randomUUID().toString());
        session = sessionRepository.save(session);

        return SessionResponse.builder()
                .id(session.getId())
                .courseId(session.getCourse().getId())
                .qrCode(session.getQrCode())
                .startTime(session.getStartTime())
                .endTime(session.getEndTime())
                .expiredAt(session.getExpiredAt())
                .subjectName(session.getCourse().getSubject().getName())
                .subjectCode(session.getCourse().getSubject().getCode())
                .className(session.getCourse().getClasses().getName())
                .semester(session.getCourse().getSemester())
                .room(session.getCourse().getRoom())
                .dayOfWeek(session.getCourse().getDayOfWeek())
                .startLesson(session.getCourse().getStartLesson())
                .endLesson(session.getCourse().getEndLesson())
                .teacherName(session.getCourse().getTeacher().getProfile() != null
                    ? session.getCourse().getTeacher().getProfile().getFullName()
                    : session.getCourse().getTeacher().getEmail())
                .build();
    }

    public List<ManualAttendanceStudentResponse> getEnrolledStudentsWithStatus(Integer courseId, Integer sessionId) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User teacher = userDetails.getUser();

        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found"));

        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new AccessDeniedException("You are not the assigned teacher of this course.");
        }

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getCourse().getId().equals(courseId)) {
            throw new IllegalArgumentException("Session does not belong to this course.");
        }

        List<Enrollment> enrollments = enrollmentRepository.findByCourseIdAndStatus(courseId, EnrollmentStatus.ACTIVE);
        List<Attendances> attendances = attendancesRepository.findBySessionId(sessionId);

        return enrollments.stream().map(enrollment -> {
            User student = enrollment.getStudent();
            Attendances att = attendances.stream()
                    .filter(a -> a.getStudent().getId().equals(student.getId()))
                    .findFirst()
                    .orElse(null);

            return ManualAttendanceStudentResponse.builder()
                    .studentId(student.getId())
                    .studentCode(student.getUsername())   // mã SV dùng để đăng nhập
                    .studentName(student.getProfile() != null ? student.getProfile().getFullName() : student.getEmail())
                    .studentEmail(student.getEmail())
                    .present(att != null)
                    .checkInTime(att != null ? att.getCheckInTime() : null)
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public void manualCheckIn(Integer sessionId, List<Integer> studentIds) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User teacher = userDetails.getUser();

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found"));

        if (!session.getCourse().getTeacher().getId().equals(teacher.getId())) {
            throw new AccessDeniedException("You are not authorized for this session.");
        }

        Integer courseId = session.getCourse().getId();

        for (Integer studentId : studentIds) {
            // Kiểm tra sinh viên có đăng ký học phần không
            if (!enrollmentRepository.existsByCourseIdAndStudentId(courseId, studentId)) {
                continue; // Bỏ qua sinh viên không đăng ký
            }
            // Kiểm tra đã điểm danh chưa
            if (attendancesRepository.existsBySessionIdAndStudentId(sessionId, studentId)) {
                continue; // Đã điểm danh rồi
            }

            User student = enrollmentRepository.findByCourseIdAndStudentId(courseId, studentId)
                    .map(Enrollment::getStudent)
                    .orElse(null);
            if (student == null) continue;

            Attendances attendance = Attendances.builder()
                    .session(session)
                    .student(student)
                    .build();
            attendancesRepository.save(attendance);
        }

        auditService.logAction(teacher, "MANUAL_CHECK_IN", "Teacher manually checked in " + studentIds.size() + " students for session " + sessionId);
    }

    // ── Export Báo Cáo Điểm Danh ─────────────────────────────────────────────

    /**
     * Xuất báo cáo điểm danh của một buổi học ra file Excel.
     * Giảng viên chỉ có thể xuất báo cáo của buổi học thuộc học phần mình phụ trách.
     *
     * @param sessionId ID buổi học cần xuất báo cáo
     * @return {@link ByteArrayInputStream} chứa nội dung file .xlsx
     * @throws IOException nếu có lỗi khi ghi file Excel
     * @throws AccessDeniedException nếu giảng viên không phụ trách buổi học này
     */
    public ByteArrayInputStream exportSessionAttendanceReport(Integer sessionId) throws IOException {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User teacher = userDetails.getUser();

        // 1. Load session và kiểm tra quyền
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy buổi học."));

        Course course = session.getCourse();
        if (!course.getTeacher().getId().equals(teacher.getId())) {
            throw new AccessDeniedException("Bạn không có quyền xuất báo cáo của buổi học này.");
        }

        // 2. Lấy danh sách sinh viên đã đăng ký (ACTIVE)
        List<Enrollment> enrollments = enrollmentRepository
                .findByCourseIdAndStatus(course.getId(), EnrollmentStatus.ACTIVE);

        // 3. Lấy danh sách sinh viên đã điểm danh (Set để tìm kiếm O(1))
        List<Attendances> attendances = attendancesRepository.findBySessionId(sessionId);
        Set<Integer> checkedInIds = attendances.stream()
                .map(a -> a.getStudent().getId())
                .collect(Collectors.toSet());
        // Map: studentId -> checkInTime
        java.util.Map<Integer, LocalDateTime> checkInTimeMap = attendances.stream()
                .collect(Collectors.toMap(
                        a -> a.getStudent().getId(),
                        Attendances::getCheckInTime
                ));

        // 4. Build danh sách StudentAttendanceRow
        List<StudentAttendanceRow> rows = new java.util.ArrayList<>();
        int stt = 1;
        for (Enrollment enrollment : enrollments) {
            User student = enrollment.getStudent();
            boolean present = checkedInIds.contains(student.getId());
            rows.add(StudentAttendanceRow.builder()
                    .stt(stt++)
                    .studentCode(student.getUsername())   // username = mã SV
                    .fullName(student.getProfile() != null
                            ? student.getProfile().getFullName()
                            : student.getEmail())
                    .present(present)
                    .checkInTime(checkInTimeMap.get(student.getId()))
                    .build());
        }

        // 5. Build CourseInfo
        String teacherName = course.getTeacher().getProfile() != null
                ? course.getTeacher().getProfile().getFullName()
                : course.getTeacher().getEmail();
        AttendanceCourseInfo courseInfo = AttendanceCourseInfo.builder()
                .subjectName(course.getSubject().getName())
                .courseCode(course.getCourseCode() != null ? course.getCourseCode() : "N/A")
                .teacherName(teacherName)
                .semesterName(course.getSemester())
                .build();

        // 6. Build DTO và gọi ExportService
        AttendanceReportDTO report = AttendanceReportDTO.builder()
                .courseInfo(courseInfo)
                .students(rows)
                .build();

        return exportService.generateAttendanceExcel(report);
    }
}
