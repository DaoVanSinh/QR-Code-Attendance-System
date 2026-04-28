package com.qrcode.backend.service;

import com.qrcode.backend.dto.response.ScheduleDTO;
import com.qrcode.backend.dto.response.TimetableResponse;
import com.qrcode.backend.entity.Course;
import com.qrcode.backend.entity.Schedule;
import com.qrcode.backend.entity.Semester;
import com.qrcode.backend.exception.ResourceNotFoundException;
import com.qrcode.backend.repository.ScheduleRepository;
import com.qrcode.backend.repository.SemesterRepository;
import com.qrcode.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final SemesterRepository semesterRepository;

    // ── Bảng quy đổi Tiết → Giờ thực (cố định) ─────────────────
    private static final Map<Integer, LocalTime> SLOT_START_TIMES = Map.ofEntries(
        Map.entry(1,  LocalTime.of(6, 45)),
        Map.entry(2,  LocalTime.of(7, 45)),
        Map.entry(3,  LocalTime.of(8, 45)),
        Map.entry(4,  LocalTime.of(9, 45)),
        Map.entry(5,  LocalTime.of(10, 45)),
        Map.entry(6,  LocalTime.of(12, 30)),
        Map.entry(7,  LocalTime.of(13, 30)),
        Map.entry(8,  LocalTime.of(14, 30)),
        Map.entry(9,  LocalTime.of(15, 30)),
        Map.entry(10, LocalTime.of(16, 30)),
        Map.entry(11, LocalTime.of(17, 30)),
        Map.entry(12, LocalTime.of(18, 30)),
        Map.entry(13, LocalTime.of(19, 30))
    );

    private static final Map<Integer, LocalTime> SLOT_END_TIMES = Map.ofEntries(
        Map.entry(1,  LocalTime.of(7, 35)),
        Map.entry(2,  LocalTime.of(8, 35)),
        Map.entry(3,  LocalTime.of(9, 35)),
        Map.entry(4,  LocalTime.of(10, 35)),
        Map.entry(5,  LocalTime.of(11, 35)),
        Map.entry(6,  LocalTime.of(13, 20)),
        Map.entry(7,  LocalTime.of(14, 20)),
        Map.entry(8,  LocalTime.of(15, 20)),
        Map.entry(9,  LocalTime.of(16, 20)),
        Map.entry(10, LocalTime.of(17, 20)),
        Map.entry(11, LocalTime.of(18, 20)),
        Map.entry(12, LocalTime.of(19, 20)),
        Map.entry(13, LocalTime.of(20, 20))
    );

    private static final String[] DOW_LABELS = {"", "", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"};

    // ── Public API ─────────────────────────────────────────────

    public static LocalTime getSlotStartTime(int slot) {
        return SLOT_START_TIMES.getOrDefault(slot, LocalTime.of(6, 45));
    }

    public static LocalTime getSlotEndTime(int slot) {
        return SLOT_END_TIMES.getOrDefault(slot, LocalTime.of(20, 20));
    }

    public static String getDowLabel(int dayOfWeek) {
        if (dayOfWeek >= 2 && dayOfWeek <= 8) return DOW_LABELS[dayOfWeek];
        return "N/A";
    }

    // ── Triple-Check Filter ────────────────────────────────────

    /**
     * Check 1: Giảng viên đã có lịch dạy khác cùng thứ, cùng tiết?
     */
    public void validateTeacherAvailability(Integer teacherId, Integer dayOfWeek,
                                            Integer startPeriod, Integer endPeriod,
                                            Integer excludeCourseId) {
        List<Schedule> conflicts = scheduleRepository.findTeacherConflicts(
            teacherId, dayOfWeek, startPeriod, endPeriod, excludeCourseId
        );
        if (!conflicts.isEmpty()) {
            Schedule c = conflicts.get(0);
            throw new IllegalArgumentException(String.format(
                "Giảng viên đang có lịch dạy khác: %s — %s, Tiết %d→%d, Phòng %s.",
                DOW_LABELS[c.getDayOfWeek()],
                c.getCourse().getSubject().getName(),
                c.getStartPeriod(), c.getEndPeriod(),
                c.getRoom()
            ));
        }
    }

    /**
     * Check 2: Phòng học đã có lớp khác cùng thứ, cùng tiết?
     */
    public void validateRoomAvailability(String room, Integer dayOfWeek,
                                         Integer startPeriod, Integer endPeriod,
                                         Integer excludeCourseId) {
        List<Schedule> conflicts = scheduleRepository.findRoomConflicts(
            room, dayOfWeek, startPeriod, endPeriod, excludeCourseId
        );
        if (!conflicts.isEmpty()) {
            Schedule c = conflicts.get(0);
            throw new IllegalArgumentException(String.format(
                "Trùng lịch! Phòng %s — %s — Tiết %d→%d đã được sử dụng bởi môn '%s' (Nhóm: %s).",
                room, DOW_LABELS[c.getDayOfWeek()],
                c.getStartPeriod(), c.getEndPeriod(),
                c.getCourse().getSubject().getName(),
                c.getCourse().getClasses().getName()
            ));
        }
    }

    /**
     * Check 3: Ngày bắt đầu/kết thúc nằm trong học kỳ?
     */
    public void validateSemesterAlignment(Course course) {
        if (course.getSemesterEntity() == null) return;
        Semester sem = course.getSemesterEntity();
        if (course.getStartDate() != null && course.getStartDate().isBefore(sem.getStartDate())) {
            throw new IllegalArgumentException(String.format(
                "Ngày bắt đầu (%s) nằm trước ngày bắt đầu học kỳ (%s).",
                course.getStartDate(), sem.getStartDate()
            ));
        }
        if (course.getEndDate() != null && course.getEndDate().isAfter(sem.getEndDate())) {
            throw new IllegalArgumentException(String.format(
                "Ngày kết thúc (%s) nằm sau ngày kết thúc học kỳ (%s).",
                course.getEndDate(), sem.getEndDate()
            ));
        }
    }

    /**
     * Run full Triple-Check Filter.
     */
    public void runTripleCheck(Integer teacherId, String room, Integer dayOfWeek,
                               Integer startPeriod, Integer endPeriod,
                               Course course, Integer excludeCourseId) {
        if (dayOfWeek != null && startPeriod != null && endPeriod != null) {
            // Check 1: Teacher
            validateTeacherAvailability(teacherId, dayOfWeek, startPeriod, endPeriod, excludeCourseId);
            // Check 2: Room
            if (room != null && !room.isBlank()) {
                validateRoomAvailability(room, dayOfWeek, startPeriod, endPeriod, excludeCourseId);
            }
        }
        // Check 3: Semester alignment
        validateSemesterAlignment(course);
    }

    // ── Student Time Conflict Check ────────────────────────────

    /**
     * Kiểm tra trùng lịch cá nhân sinh viên khi đăng ký.
     * Trả về tên môn trùng hoặc null nếu OK.
     */
    public String checkStudentTimeConflict(Integer studentId, Integer courseId) {
        List<Schedule> courseSchedules = scheduleRepository.findByCourseId(courseId);
        for (Schedule cs : courseSchedules) {
            List<Schedule> conflicts = scheduleRepository.findStudentTimeConflicts(
                studentId, cs.getDayOfWeek(), cs.getStartPeriod(), cs.getEndPeriod(), courseId
            );
            if (!conflicts.isEmpty()) {
                Schedule c = conflicts.get(0);
                return String.format(
                    "Trùng lịch với môn '%s' (%s, Tiết %d→%d).",
                    c.getCourse().getSubject().getName(),
                    DOW_LABELS[c.getDayOfWeek()],
                    c.getStartPeriod(), c.getEndPeriod()
                );
            }
        }
        return null;
    }

    // ── Timetable Data ─────────────────────────────────────────

    /**
     * Lấy TKB sinh viên — chỉ các môn đã đăng ký ACTIVE.
     */
    public TimetableResponse getStudentTimetable(Integer semesterId) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        List<Schedule> schedules = scheduleRepository.findByStudentEnrolled(
            userDetails.getUser().getId(), semesterId
        );
        return buildTimetableResponse(schedules);
    }

    /**
     * Lấy TKB giảng viên.
     */
    public TimetableResponse getTeacherTimetable(Integer semesterId) {
        CustomUserDetails userDetails = (CustomUserDetails) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        List<Schedule> schedules = scheduleRepository.findByTeacher(
            userDetails.getUser().getId(), semesterId
        );
        return buildTimetableResponse(schedules);
    }

    /**
     * Lấy TKB toàn trường (Admin).
     */
    public TimetableResponse getAdminTimetable(Integer semesterId) {
        List<Schedule> schedules = scheduleRepository.findBySemester(semesterId);
        return buildTimetableResponse(schedules);
    }

    // ── Private helpers ────────────────────────────────────────

    private TimetableResponse buildTimetableResponse(List<Schedule> schedules) {
        Map<Integer, List<ScheduleDTO>> grouped = new LinkedHashMap<>();
        // Initialize all days (2=Mon ... 8=Sun)
        for (int d = 2; d <= 8; d++) {
            grouped.put(d, new ArrayList<>());
        }

        for (Schedule s : schedules) {
            ScheduleDTO dto = toScheduleDTO(s);
            grouped.computeIfAbsent(s.getDayOfWeek(), k -> new ArrayList<>()).add(dto);
        }

        // Sort each day by startPeriod
        grouped.values().forEach(list -> list.sort(Comparator.comparing(ScheduleDTO::getStartPeriod)));

        return TimetableResponse.builder()
                .schedulesByDay(grouped)
                .totalCourses((int) schedules.stream().map(s -> s.getCourse().getId()).distinct().count())
                .build();
    }

    private ScheduleDTO toScheduleDTO(Schedule s) {
        Course c = s.getCourse();
        String teacherName = c.getTeacher().getProfile() != null
                ? c.getTeacher().getProfile().getFullName()
                : c.getTeacher().getEmail();

        return ScheduleDTO.builder()
                .scheduleId(s.getId())
                .courseId(c.getId())
                .subjectName(c.getSubject().getName())
                .subjectCode(c.getSubject().getCode())
                .credits(c.getSubject().getCredits())
                .className(c.getClasses().getName())
                .teacherName(teacherName)
                .semester(c.getSemester())
                .dayOfWeek(s.getDayOfWeek())
                .dayOfWeekLabel(getDowLabel(s.getDayOfWeek()))
                .startPeriod(s.getStartPeriod())
                .endPeriod(s.getEndPeriod())
                .numSlots(s.getEndPeriod() - s.getStartPeriod() + 1)
                .room(s.getRoom())
                .startTime(getSlotStartTime(s.getStartPeriod()).toString())
                .endTime(getSlotEndTime(s.getEndPeriod()).toString())
                .isPrimary(s.getIsPrimary())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .maxSlots(c.getMaxSlots())
                .currentSlots(c.getCurrentSlots())
                .build();
    }
}
