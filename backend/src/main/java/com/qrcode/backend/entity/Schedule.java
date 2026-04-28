package com.qrcode.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(name = "day_of_week", nullable = false, columnDefinition = "tinyint")
    private Integer dayOfWeek; // 2=Thứ2, 3=Thứ3,..., 8=CN

    @Column(name = "start_period", nullable = false, columnDefinition = "tinyint")
    private Integer startPeriod; // Tiết bắt đầu 1-13

    @Column(name = "end_period", nullable = false, columnDefinition = "tinyint")
    private Integer endPeriod; // Tiết kết thúc 1-13

    @Column(name = "room", nullable = false, length = 50)
    private String room;

    @Column(name = "is_primary", nullable = false, columnDefinition = "tinyint(1)")
    @Builder.Default
    private Boolean isPrimary = true; // 1=lịch chính, 0=lịch bù/ghép

    @Column(name = "effective_from")
    private LocalDate effectiveFrom; // NULL = dùng ngay từ đầu HK

    @Column(name = "effective_to")
    private LocalDate effectiveTo; // NULL = dùng đến hết HK
}
