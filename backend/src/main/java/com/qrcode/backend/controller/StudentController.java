package com.qrcode.backend.controller;

import com.qrcode.backend.dto.request.CheckInRequest;
import com.qrcode.backend.dto.response.EnrolledCourseResponse;
import com.qrcode.backend.dto.response.MyAttendanceResponse;
import com.qrcode.backend.dto.response.SemesterResponse;
import com.qrcode.backend.service.AdminService;
import com.qrcode.backend.service.AttendanceService;
import com.qrcode.backend.service.EnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
public class StudentController {

    private final AttendanceService attendanceService;
    private final EnrollmentService enrollmentService;
    private final AdminService adminService;

    // ── Điểm danh ─────────────────────────────────────────────
    @PostMapping("/attendances/check-in")
    public ResponseEntity<Map<String, String>> checkIn(@Valid @RequestBody CheckInRequest request) {
        attendanceService.checkIn(request);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Điểm danh thành công!");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-attendances")
    public ResponseEntity<List<MyAttendanceResponse>> getMyAttendances() {
        return ResponseEntity.ok(attendanceService.getMyAttendances());
    }

    // ── Đăng ký học phần ──────────────────────────────────────
    @GetMapping("/courses")
    public ResponseEntity<List<EnrolledCourseResponse>> getAllCourses() {
        return ResponseEntity.ok(enrollmentService.getAllCoursesWithEnrollmentStatus());
    }

    @PostMapping("/courses/{courseId}/enroll")
    public ResponseEntity<Map<String, String>> enroll(@PathVariable Integer courseId) {
        enrollmentService.enroll(courseId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Đăng ký học phần thành công!");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/courses/{courseId}/unenroll")
    public ResponseEntity<Map<String, String>> unenroll(@PathVariable Integer courseId) {
        enrollmentService.unenroll(courseId);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Hủy đăng ký học phần thành công.");
        return ResponseEntity.ok(response);
    }

    // ── Semesters ──────────────────────────────────
    @GetMapping("/semesters")
    public ResponseEntity<List<SemesterResponse>> getSemesters() {
        return ResponseEntity.ok(adminService.getAllSemesters());
    }
}
