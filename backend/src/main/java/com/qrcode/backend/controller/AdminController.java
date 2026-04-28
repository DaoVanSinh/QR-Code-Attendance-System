package com.qrcode.backend.controller;

import com.qrcode.backend.dto.request.AdminCreateUserRequest;
import com.qrcode.backend.dto.request.CreateCourseRequest;
import com.qrcode.backend.dto.response.AdminSessionResponse;
import com.qrcode.backend.dto.response.CourseDetailResponse;
import com.qrcode.backend.dto.response.SemesterResponse;
import com.qrcode.backend.dto.response.TimetableResponse;
import com.qrcode.backend.dto.response.UserSummaryResponse;
import com.qrcode.backend.entity.Classes;
import com.qrcode.backend.entity.Subject;
import com.qrcode.backend.repository.SubjectRepository;
import com.qrcode.backend.repository.UserRepository;
import com.qrcode.backend.service.AdminService;
import com.qrcode.backend.service.ScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final SubjectRepository subjectRepository;
    private final AdminService adminService;
    private final ScheduleService scheduleService;

    // ── Users ──────────────────────────────────────────────────
    @GetMapping("/users")
    public ResponseEntity<List<UserSummaryResponse>> getUsers() {
        List<UserSummaryResponse> users = userRepository.findAll().stream()
                .map(u -> UserSummaryResponse.builder()
                        .id(u.getId())
                        .email(u.getEmail())
                        .role(u.getRole().name())
                        .fullName(u.getProfile() != null ? u.getProfile().getFullName() : "")
                        .username(u.getUsername())
                        .createdAt(u.getCreatedAt() != null ? u.getCreatedAt().toString() : "")
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @PostMapping("/create-user")
    public ResponseEntity<?> createUser(@RequestBody AdminCreateUserRequest request) {
        try {
            adminService.createUser(request);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            HttpStatus status = e.getMessage().contains("đã tồn tại") ? HttpStatus.CONFLICT : HttpStatus.BAD_REQUEST;
            return new ResponseEntity<>(Map.of("error", e.getMessage()), status);
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Integer id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/teachers")
    public ResponseEntity<List<UserSummaryResponse>> getTeachers() {
        return ResponseEntity.ok(adminService.getTeachers());
    }

    // ── Subjects ───────────────────────────────────────────────
    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getSubjects() {
        return ResponseEntity.ok(adminService.getAllSubjects());
    }

    // ── Classes ────────────────────────────────────────────────
    @GetMapping("/classes")
    public ResponseEntity<List<Classes>> getClasses() {
        return ResponseEntity.ok(adminService.getAllClasses());
    }

    // ── Courses ────────────────────────────────────────────────
    @GetMapping("/courses")
    public ResponseEntity<List<CourseDetailResponse>> getCourses() {
        return ResponseEntity.ok(adminService.getAllCourses());
    }

    @PostMapping("/courses")
    public ResponseEntity<?> createCourse(@RequestBody CreateCourseRequest request) {
        try {
            CourseDetailResponse result = adminService.createCourse(request);
            return new ResponseEntity<>(result, HttpStatus.CREATED);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/courses/{id}")
    public ResponseEntity<?> updateCourse(@PathVariable Integer id, @RequestBody CreateCourseRequest request) {
        try {
            CourseDetailResponse result = adminService.updateCourse(id, request);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable Integer id) {
        try {
            adminService.deleteCourse(id);
            return ResponseEntity.ok(Map.of("message", "Xóa học phần thành công."));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ── Sessions (Admin read-only) ─────────────────────────
    @GetMapping("/sessions")
    public ResponseEntity<List<AdminSessionResponse>> getAllSessions() {
        return ResponseEntity.ok(adminService.getAllSessions());
    }

    // ── Semesters ──────────────────────────────────────────
    @GetMapping("/semesters")
    public ResponseEntity<List<SemesterResponse>> getSemesters() {
        return ResponseEntity.ok(adminService.getAllSemesters());
    }

    // ── Timetable ──────────────────────────────────────────
    @GetMapping("/timetable")
    public ResponseEntity<TimetableResponse> getTimetable(
            @RequestParam(required = false) Integer semesterId) {
        return ResponseEntity.ok(scheduleService.getAdminTimetable(semesterId));
    }
}
