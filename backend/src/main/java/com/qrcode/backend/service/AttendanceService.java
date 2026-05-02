package com.qrcode.backend.service;

import com.qrcode.backend.dto.request.CheckInRequest;
import com.qrcode.backend.dto.response.MyAttendanceResponse;
import com.qrcode.backend.entity.Attendances;
import com.qrcode.backend.entity.Session;
import com.qrcode.backend.entity.User;
import com.qrcode.backend.exception.DuplicateAttendanceException;
import com.qrcode.backend.exception.ResourceNotFoundException;
import com.qrcode.backend.exception.TokenExpiredException;
import com.qrcode.backend.repository.AttendancesRepository;
import com.qrcode.backend.repository.EnrollmentRepository;
import com.qrcode.backend.repository.SessionRepository;
import com.qrcode.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AttendanceService {

    private final SessionRepository sessionRepository;
    private final AttendancesRepository attendancesRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final AuditService auditService;

    @Transactional
    public void checkIn(CheckInRequest request) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User student = userDetails.getUser();

        // Tìm session bằng qrCode HOẶC previousQrCode
        // → Đảm bảo sinh viên quét đúng lúc mã vừa được refresh vẫn điểm danh được
        Session session = sessionRepository
                .findByQrCodeOrPreviousQrCode(request.getQrCode(), request.getQrCode())
                .orElseThrow(() -> new ResourceNotFoundException("Mã QR không hợp lệ hoặc đã hết hạn."));

        if (session.getExpiredAt() != null && session.getExpiredAt().isBefore(LocalDateTime.now())) {
            throw new TokenExpiredException("Phiên điểm danh này đã hết hạn.");
        }


        // ── Kiểm tra sinh viên đã đăng ký học phần chưa ──
        Integer courseId = session.getCourse().getId();
        if (!enrollmentRepository.existsByCourseIdAndStudentId(courseId, student.getId())) {
            throw new AccessDeniedException("Bạn chưa đăng ký học phần này. Vui lòng đăng ký trước khi điểm danh.");
        }

        if (attendancesRepository.existsBySessionIdAndStudentId(session.getId(), student.getId())) {
            throw new DuplicateAttendanceException("Bạn đã điểm danh cho buổi học này rồi.");
        }

        Attendances attendance = Attendances.builder()
                .session(session)
                .student(student)
                .build();

        attendancesRepository.save(attendance);

        auditService.logAction(student, "CHECK_IN_SUCCESS", "Student checked in to session " + session.getId());
    }

    public List<MyAttendanceResponse> getMyAttendances() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User student = userDetails.getUser();

        List<Attendances> records = attendancesRepository.findByStudentIdOrderByCheckInTimeDesc(student.getId());

        return records.stream()
                .map(att -> {
                    Session s = att.getSession();
                    return MyAttendanceResponse.builder()
                            .attendanceId(att.getId())
                            .sessionId(s.getId())
                            .subjectName(s.getCourse().getSubject().getName())
                            .subjectCode(s.getCourse().getSubject().getCode())
                            .className(s.getCourse().getClasses().getName())
                            .semester(s.getCourse().getSemester())
                            .sessionStartTime(s.getStartTime())
                            .sessionEndTime(s.getEndTime())
                            .checkInTime(att.getCheckInTime())
                            .build();
                })
                .collect(Collectors.toList());
    }
}
