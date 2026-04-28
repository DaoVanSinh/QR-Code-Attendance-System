package com.qrcode.backend.entity;

import com.qrcode.backend.entity.enums.RegStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "course", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"subject_id", "teacher_id", "classes_id", "semester"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "course_code", length = 30, unique = true)
    private String courseCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classes_id", nullable = false)
    private Classes classes;

    @Column(nullable = false, length = 100)
    private String semester;

    @Column(name = "max_slots", nullable = false)
    @Builder.Default
    private Integer maxSlots = 50;

    @Column(name = "current_slots", nullable = false)
    @Builder.Default
    private Integer currentSlots = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "reg_status", nullable = false)
    @Builder.Default
    private RegStatus regStatus = RegStatus.OPEN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id")
    private Semester semesterEntity;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    // ── Legacy columns — giữ cho backward-compatible ──────────
    @Column(name = "day_of_week")
    private Integer dayOfWeek;

    @Column(name = "start_lesson")
    private Integer startLesson;

    @Column(name = "end_lesson")
    private Integer endLesson;

    @Column(name = "room", length = 50)
    private String room;

    // ── Relationship: Course ↔ Schedule ───────────────────────
    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Schedule> schedules = new ArrayList<>();
}
