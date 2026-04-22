-- V11__Expand_User_And_Profile.sql — Thêm username/birthday/gender vào user, student_code/department/class_name vào profile

-- ============================================================
-- 1. Mở rộng bảng user — username, birthday, gender
-- ============================================================
ALTER TABLE `user`
  ADD COLUMN `username` VARCHAR(50)  NULL AFTER `email`,
  ADD COLUMN `birthday` DATE         NULL,
  ADD COLUMN `gender`   ENUM('MALE','FEMALE','OTHER') NULL;

-- Unique index cho login bằng username (mã sinh viên / mã giảng viên)
CREATE UNIQUE INDEX `idx_user_username` ON `user` (`username`);

-- ============================================================
-- 2. Mở rộng bảng profile — student_code, department, class_name
-- ============================================================
ALTER TABLE `profile`
  ADD COLUMN `student_code` VARCHAR(20)  NULL AFTER `full_name`,
  ADD COLUMN `department`   VARCHAR(100) NULL,
  ADD COLUMN `class_name`   VARCHAR(50)  NULL COMMENT 'Lớp sinh hoạt của sinh viên';

-- Unique index cho student_code
CREATE UNIQUE INDEX `idx_profile_student_code` ON `profile` (`student_code`);
