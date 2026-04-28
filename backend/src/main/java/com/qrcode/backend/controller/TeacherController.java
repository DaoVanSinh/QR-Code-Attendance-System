package com.qrcode.backend.controller;

import com.qrcode.backend.dto.request.CreateSessionRequest;
import com.qrcode.backend.dto.request.ManualAttendanceRequest;
import com.qrcode.backend.dto.response.AttendanceRecordResponse;
import com.qrcode.backend.dto.response.CourseResponse;
import com.qrcode.backend.dto.response.ManualAttendanceStudentResponse;
import com.qrcode.backend.dto.response.SemesterResponse;
import com.qrcode.backend.dto.response.SessionResponse;
import com.qrcode.backend.dto.response.SessionSummaryResponse;
import com.qrcode.backend.dto.response.TimetableResponse;
import com.qrcode.backend.service.AdminService;
import com.qrcode.backend.service.ScheduleService;
import com.qrcode.backend.service.SessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
public class TeacherController {

    private final SessionService sessionService;
    private final AdminService adminService;
    private final ScheduleService scheduleService;

    @GetMapping("/courses")
    public ResponseEntity<List<CourseResponse>> getMyCourses() {
        return ResponseEntity.ok(sessionService.getMyCourses());
    }

    @PostMapping("/courses/{courseId}/sessions")
    public ResponseEntity<SessionResponse> createSession(
            @PathVariable Integer courseId,
            @Valid @RequestBody CreateSessionRequest request) {
        return new ResponseEntity<>(sessionService.createSession(courseId, request), HttpStatus.CREATED);
    }

    @GetMapping("/courses/{courseId}/sessions")
    public ResponseEntity<List<SessionSummaryResponse>> getCourseSessions(@PathVariable Integer courseId) {
        return ResponseEntity.ok(sessionService.getCourseSessions(courseId));
    }

    @GetMapping("/sessions/{sessionId}/attendances")
    public ResponseEntity<List<AttendanceRecordResponse>> getSessionAttendances(@PathVariable Integer sessionId) {
        return ResponseEntity.ok(sessionService.getSessionAttendances(sessionId));
    }

    @PutMapping("/sessions/{sessionId}/refresh-qr")
    public ResponseEntity<SessionResponse> refreshQrCode(@PathVariable Integer sessionId) {
        return ResponseEntity.ok(sessionService.refreshQrCode(sessionId));
    }

    // ── Manual Attendance ─────────────────────────────────────
    @GetMapping("/courses/{courseId}/sessions/{sessionId}/students")
    public ResponseEntity<List<ManualAttendanceStudentResponse>> getEnrolledStudents(
            @PathVariable Integer courseId,
            @PathVariable Integer sessionId) {
        return ResponseEntity.ok(sessionService.getEnrolledStudentsWithStatus(courseId, sessionId));
    }

    @PostMapping("/sessions/{sessionId}/manual-check-in")
    public ResponseEntity<Map<String, String>> manualCheckIn(
            @PathVariable Integer sessionId,
            @Valid @RequestBody ManualAttendanceRequest request) {
        sessionService.manualCheckIn(sessionId, request.getStudentIds());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Điểm danh thủ công thành công!");
        return ResponseEntity.ok(response);
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
        return ResponseEntity.ok(scheduleService.getTeacherTimetable(semesterId));
    }
}
