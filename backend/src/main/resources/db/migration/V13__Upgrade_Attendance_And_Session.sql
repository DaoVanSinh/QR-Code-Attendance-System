-- V13__Upgrade_Attendance_And_Session.sql — Mở rộng attendances (status/method/verifier) và session (schedule_id/actual_date/title)

-- ============================================================
-- 1. Mở rộng bảng attendances — status, method, note, verified_by
-- ============================================================
ALTER TABLE `attendances`
  ADD COLUMN `status`      ENUM('PRESENT','ABSENT','LATE','EXCUSED')
                           NOT NULL DEFAULT 'PRESENT'  AFTER `student_id`,
  ADD COLUMN `method`      ENUM('QR','MANUAL')
                           NOT NULL DEFAULT 'QR'       AFTER `status`,
  ADD COLUMN `note`        VARCHAR(255) NULL            AFTER `method`,
  ADD COLUMN `verified_by` INT          NULL            AFTER `note`;

-- FK: verified_by → user(id) (teacher điểm danh thủ công)
ALTER TABLE `attendances`
  ADD CONSTRAINT `fk_attendance_verifier`
    FOREIGN KEY (`verified_by`) REFERENCES `user` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Index cho query thống kê
CREATE INDEX `idx_attendance_method` ON `attendances` (`session_id`, `method`);
CREATE INDEX `idx_attendance_status` ON `attendances` (`session_id`, `status`);

-- ============================================================
-- 2. Mở rộng bảng session — schedule_id, actual_date, title, created_by
-- ============================================================
ALTER TABLE `session`
  ADD COLUMN `schedule_id` INT          NULL  AFTER `course_id`,
  ADD COLUMN `actual_date` DATE         NULL  AFTER `schedule_id`,
  ADD COLUMN `title`       VARCHAR(100) NULL,
  ADD COLUMN `created_by`  INT          NULL;

-- FK: session.schedule_id → schedules(id)
ALTER TABLE `session`
  ADD CONSTRAINT `fk_session_schedule`
    FOREIGN KEY (`schedule_id`) REFERENCES `schedules` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: session.created_by → user(id) (teacher tạo session)
ALTER TABLE `session`
  ADD CONSTRAINT `fk_session_creator`
    FOREIGN KEY (`created_by`) REFERENCES `user` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill actual_date từ start_time cho dữ liệu cũ
UPDATE `session` SET `actual_date` = DATE(`start_time`) WHERE `actual_date` IS NULL;

-- Index session theo ngày
CREATE INDEX `idx_session_date` ON `session` (`course_id`, `actual_date`);

-- ============================================================
-- 3. Index hiệu năng tổng thể
-- ============================================================

-- Query điểm danh theo student
CREATE INDEX `idx_attendance_student` ON `attendances` (`student_id`, `check_in_time`);

-- Query enrollment theo student + status
CREATE INDEX `idx_enrollment_student_status` ON `enrollment` (`student_id`, `status`);
