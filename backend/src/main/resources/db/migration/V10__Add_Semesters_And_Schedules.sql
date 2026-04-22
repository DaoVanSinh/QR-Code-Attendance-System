-- V10__Add_Semesters_And_Schedules.sql — Tạo bảng semesters, schedules và mở rộng course

-- ============================================================
-- 1. Bảng semesters — Quản lý học kỳ tập trung
-- ============================================================
CREATE TABLE IF NOT EXISTS `semesters` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `name`        VARCHAR(20)  NOT NULL COMMENT 'HK1, HK2, HK3',
  `school_year` VARCHAR(20)  NOT NULL COMMENT '2024-2025, 2025-2026',
  `start_date`  DATE         NOT NULL,
  `end_date`    DATE         NOT NULL,
  `is_active`   TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '1 = học kỳ hiện tại',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_semester` (`name`, `school_year`),
  CONSTRAINT `chk_semester_dates` CHECK (`end_date` > `start_date`),
  CONSTRAINT `chk_semester_name`  CHECK (`name` IN ('HK1','HK2','HK3'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


INSERT INTO `semesters` (`name`, `school_year`, `start_date`, `end_date`, `is_active`) VALUES
  ('HK1', '2024-2025', '2024-09-02', '2025-01-17', 0),
  ('HK2', '2024-2025', '2025-01-20', '2025-06-06', 0),
  ('HK3', '2024-2025', '2025-06-16', '2025-08-22', 0),
  ('HK1', '2025-2026', '2025-09-01', '2026-01-16', 1),
  ('HK2', '2025-2026', '2026-01-19', '2026-06-05', 0),
  ('HK3', '2025-2026', '2026-06-15', '2026-08-21', 0);

-- ============================================================
-- 2. Mở rộng bảng course — semester_id, slots, course_code
-- ============================================================
ALTER TABLE `course`
  ADD COLUMN `course_code`   VARCHAR(30)  NULL UNIQUE          AFTER `id`,
  ADD COLUMN `max_slots`     INT          NOT NULL DEFAULT 50  AFTER `semester`,
  ADD COLUMN `current_slots` INT          NOT NULL DEFAULT 0   AFTER `max_slots`,
  ADD COLUMN `reg_status`    ENUM('OPEN','CLOSED','PENDING')
                             NOT NULL DEFAULT 'OPEN'           AFTER `current_slots`,
  ADD COLUMN `semester_id`   INT          NULL                 AFTER `reg_status`;

-- FK: course.semester_id → semesters.id
ALTER TABLE `course`
  ADD CONSTRAINT `fk_course_semester`
    FOREIGN KEY (`semester_id`) REFERENCES `semesters` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Sync current_slots từ enrollment hiện có
UPDATE `course` c
SET c.`current_slots` = (
  SELECT COUNT(*) FROM `enrollment` e WHERE e.`course_id` = c.`id`
);

-- ============================================================
-- 3. Bảng schedules — Tách lịch học ra khỏi course
-- ============================================================
CREATE TABLE IF NOT EXISTS `schedules` (
  `id`             INT          NOT NULL AUTO_INCREMENT,
  `course_id`      INT          NOT NULL,
  `day_of_week`    TINYINT      NOT NULL COMMENT '2=Thứ2, 3=Thứ3,..., 8=CN',
  `start_period`   TINYINT      NOT NULL COMMENT 'Tiết bắt đầu 1-13',
  `end_period`     TINYINT      NOT NULL COMMENT 'Tiết kết thúc 1-13',
  `room`           VARCHAR(50)  NOT NULL,
  `is_primary`     TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '1=lịch chính, 0=lịch bù/ghép',
  `effective_from` DATE         NULL     COMMENT 'NULL = dùng ngay từ đầu HK',
  `effective_to`   DATE         NULL     COMMENT 'NULL = dùng đến hết HK',

  PRIMARY KEY (`id`),
  INDEX `idx_schedule_course` (`course_id`),
  INDEX `idx_schedule_lookup` (`day_of_week`, `room`, `start_period`, `end_period`),
  CONSTRAINT `fk_schedule_course`
    FOREIGN KEY (`course_id`) REFERENCES `course` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_periods`      CHECK (`end_period` >= `start_period`),
  CONSTRAINT `chk_day_range`    CHECK (`day_of_week` BETWEEN 2 AND 8),
  CONSTRAINT `chk_period_range` CHECK (`start_period` BETWEEN 1 AND 13 AND `end_period` BETWEEN 1 AND 13)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Migrate dữ liệu cũ từ course → schedules
-- ============================================================
INSERT INTO `schedules` (`course_id`, `day_of_week`, `start_period`, `end_period`, `room`, `is_primary`)
SELECT `id`, `day_of_week`, `start_lesson`, `end_lesson`, COALESCE(`room`, 'TBD'), 1
FROM `course`
WHERE `day_of_week` IS NOT NULL
  AND `start_lesson` IS NOT NULL
  AND `end_lesson`   IS NOT NULL;

-- ============================================================
-- 5. Index hiệu năng cho check trùng lịch
-- ============================================================
CREATE INDEX `idx_schedule_conflict`
  ON `schedules` (`day_of_week`, `room`, `start_period`, `end_period`);

-- Index query TKB theo teacher + semester
CREATE INDEX `idx_course_teacher` ON `course` (`teacher_id`, `semester_id`);
