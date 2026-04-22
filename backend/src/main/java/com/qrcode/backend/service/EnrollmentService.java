package com.qrcode.backend.service;

import com.qrcode.backend.dto.response.EnrolledCourseResponse;
import com.qrcode.backend.entity.Course;
import com.qrcode.backend.entity.Enrollment;
import com.qrcode.backend.entity.User;
import com.qrcode.backend.entity.enums.Role;
import com.qrcode.backend.exception.ResourceNotFoundException;
import com.qrcode.backend.repository.CourseRepository;
import com.qrcode.backend.repository.EnrollmentRepository;
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
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;

    /**
     * Lấy danh sách tất cả khóa học có thể đăng ký,
     * kèm theo trạng thái đã đăng ký hay chưa.
     */
    public List<EnrolledCourseResponse> getAllCoursesWithEnrollmentStatus() {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        User student = userDetails.getUser();

        List<Course> allCourses = courseRepository.findAll();
        Set<Integer> enrolledCourseIds = enrollmentRepository.findByStudentId(student.getId())
                .stream()
                .map(e -> e.getCourse().getId())
                .collect(Collectors.toSet());

        return allCourses.stream()
                .map(c -> {
                    String teacherName = c.getTeacher().getProfile() != null
                            ? c.getTeacher().getProfile().getFullName()
                            : c.getTeacher().getEmail();
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
                            .room(c.getRoom())
                            .startDate(c.getStartDate())
                            .endDate(c.getEndDate())
                            .enrolled(enrolledCourseIds.contains(c.getId()))
                            .build();
                })
                .collect(Collectors.toList());
    }

    /**
     * Sinh viên đăng ký học phần.
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

        if (enrollmentRepository.existsByCourseIdAndStudentId(courseId, student.getId())) {
            throw new IllegalArgumentException("Bạn đã đăng ký học phần này rồi.");
        }

        Enrollment enrollment = Enrollment.builder()
                .course(course)
                .student(student)
                .build();

        enrollmentRepository.save(enrollment);
    }

    /**
     * Sinh viên hủy đăng ký học phần.
     */
    @Transactional
    public void unenroll(Integer courseId) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        User student = userDetails.getUser();

        if (!enrollmentRepository.existsByCourseIdAndStudentId(courseId, student.getId())) {
            throw new ResourceNotFoundException("Bạn chưa đăng ký học phần này.");
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
