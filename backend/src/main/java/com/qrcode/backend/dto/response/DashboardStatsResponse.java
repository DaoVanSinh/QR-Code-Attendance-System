package com.qrcode.backend.dto.response;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {

    // ── Counts ──
    private long totalStudents;
    private long totalTeachers;
    private long totalCourses;
    private long totalSessions;
    private long totalAttendances;
    private long totalSubjects;
    private long activeSessions;

    // ── Enrollment breakdown ──
    private long enrollmentActive;
    private long enrollmentCancelled;
    private long enrollmentPending;

    // ── Current semester ──
    private SemesterInfo currentSemester;

    // ── Attendance last 7 days ──
    private List<DailyAttendance> attendanceLast7Days;

    // ── Today's schedule ──
    private List<TodayScheduleInfo> todaySchedules;

    // ── Quick stats ──
    private long todaySessionCount;
    private long todayAttendanceCount;

    // ── Nested DTOs ──

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SemesterInfo {
        private Integer id;
        private String name;
        private String nameFull;
        private String schoolYear;
        private LocalDate startDate;
        private LocalDate endDate;
        private Boolean isActive;
        private int totalWeeks;
        private int currentWeek;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class DailyAttendance {
        private String date;     // "02/05"
        private String dayLabel; // "T2", "T3", ...
        private long count;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TodayScheduleInfo {
        private Integer courseId;
        private String subjectName;
        private String subjectCode;
        private String className;
        private String teacherName;
        private String room;
        private int startLesson;
        private int endLesson;
        private String startTime;
        private String endTime;
    }
}
