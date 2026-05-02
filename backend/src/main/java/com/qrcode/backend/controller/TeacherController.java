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
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Teacher API", description = "Các endpoint dành riêng cho giảng viên")
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

    // ── Export Báo Cáo Điểm Danh ──────────────────────────
    @Operation(
        summary     = "Xuất báo cáo điểm danh (Excel)",
        description = "Tạo và tải xuống file .xlsx chứa danh sách điểm danh của toàn bộ sinh viên "
                    + "trong một buổi học. Chỉ giảng viên phụ trách buổi học mới được phép truy cập."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200",
            description = "File Excel tải xuống thành công",
            content = @Content(mediaType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")),
        @ApiResponse(responseCode = "403",
            description = "Không có quyền xuất báo cáo của buổi học này",
            content = @Content(mediaType = "application/json")),
        @ApiResponse(responseCode = "404",
            description = "Không tìm thấy buổi học",
            content = @Content(mediaType = "application/json"))
    })
    @GetMapping("/sessions/{sessionId}/export")
    public ResponseEntity<Resource> exportAttendanceReport(
            @Parameter(description = "ID của buổi học cần xuất báo cáo", required = true, example = "42")
            @PathVariable Integer sessionId) throws IOException {

        ByteArrayInputStream excelStream = sessionService.exportSessionAttendanceReport(sessionId);

        // Đặt tên file: diemdanh_session_<id>_<timestamp>.xlsx
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String filename  = String.format("diemdanh_session_%d_%s.xlsx", sessionId, timestamp);

        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");
        headers.add(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate");

        return ResponseEntity.ok()
                .headers(headers)
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(new InputStreamResource(excelStream));
    }
}
