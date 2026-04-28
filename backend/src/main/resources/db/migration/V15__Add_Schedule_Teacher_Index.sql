-- V15__Add_Schedule_Teacher_Index.sql — Index hỗ trợ Triple-Check Filter

-- ============================================================
-- 1. Index hỗ trợ query tìm conflict giảng viên
--    (join schedules → course → teacher)
-- ============================================================
CREATE INDEX `idx_course_teacher_semester`
  ON `course` (`teacher_id`, `semester_id`);

-- ============================================================
-- 2. Index composite cho query TKB nhanh theo student
--    (join enrollment → course → schedules)
-- ============================================================
CREATE INDEX `idx_enrollment_course_student`
  ON `enrollment` (`student_id`, `course_id`, `status`);
