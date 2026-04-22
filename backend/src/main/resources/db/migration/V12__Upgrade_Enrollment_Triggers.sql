-- V12__Upgrade_Enrollment_Triggers.sql — Thêm status/note vào enrollment + tạo 4 trigger quản lý slot

-- ============================================================
-- 1. Mở rộng bảng enrollment — status, note
-- ============================================================
ALTER TABLE `enrollment`
  ADD COLUMN `status` ENUM('ACTIVE','CANCELLED','PENDING')
                      NOT NULL DEFAULT 'ACTIVE'  AFTER `enrolled_at`,
  ADD COLUMN `note`   VARCHAR(255) NULL;

-- Index cho query theo trạng thái
CREATE INDEX `idx_enrollment_status` ON `enrollment` (`course_id`, `status`);

-- ============================================================
-- 2. Sync current_slots trong course từ dữ liệu enrollment hiện có
--    (chỉ đếm enrollment ACTIVE)
-- ============================================================
UPDATE `course` c
SET c.`current_slots` = (
  SELECT COUNT(*)
  FROM `enrollment` e
  WHERE e.`course_id` = c.`id`
    AND e.`status` = 'ACTIVE'
);

-- ============================================================
-- 3. Tạo 4 trigger quản lý slot tự động
-- ============================================================

DELIMITER $$

-- 3a. BEFORE INSERT: kiểm tra slot còn trống + lớp chưa đóng
CREATE TRIGGER `trg_enrollment_check_slots`
BEFORE INSERT ON `enrollment`
FOR EACH ROW
BEGIN
  DECLARE v_max    INT;
  DECLARE v_curr   INT;
  DECLARE v_status VARCHAR(10);

  SELECT `max_slots`, `current_slots`, `reg_status`
    INTO v_max, v_curr, v_status
    FROM `course`
   WHERE `id` = NEW.`course_id`
     FOR UPDATE;

  IF v_status = 'CLOSED' THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Lớp học phần đã đóng đăng ký.';
  END IF;

  IF v_curr >= v_max THEN
    SIGNAL SQLSTATE '45001'
      SET MESSAGE_TEXT = 'Lớp học phần đã đủ số lượng sinh viên (hết chỗ).';
  END IF;
END$$

-- 3b. AFTER INSERT: tăng current_slots nếu status = ACTIVE
CREATE TRIGGER `trg_enrollment_after_insert`
AFTER INSERT ON `enrollment`
FOR EACH ROW
BEGIN
  IF NEW.`status` = 'ACTIVE' THEN
    UPDATE `course`
    SET `current_slots` = `current_slots` + 1
    WHERE `id` = NEW.`course_id`;
  END IF;
END$$

-- 3c. AFTER UPDATE: điều chỉnh current_slots khi status thay đổi
CREATE TRIGGER `trg_enrollment_after_update`
AFTER UPDATE ON `enrollment`
FOR EACH ROW
BEGIN
  -- ACTIVE → CANCELLED: giảm slot
  IF OLD.`status` = 'ACTIVE' AND NEW.`status` = 'CANCELLED' THEN
    UPDATE `course`
    SET `current_slots` = GREATEST(0, `current_slots` - 1)
    WHERE `id` = NEW.`course_id`;
  END IF;

  -- CANCELLED → ACTIVE: tăng slot
  IF OLD.`status` = 'CANCELLED' AND NEW.`status` = 'ACTIVE' THEN
    UPDATE `course`
    SET `current_slots` = `current_slots` + 1
    WHERE `id` = NEW.`course_id`;
  END IF;
END$$

-- 3d. AFTER DELETE: giảm current_slots
CREATE TRIGGER `trg_enrollment_after_delete`
AFTER DELETE ON `enrollment`
FOR EACH ROW
BEGIN
  IF OLD.`status` = 'ACTIVE' THEN
    UPDATE `course`
    SET `current_slots` = GREATEST(0, `current_slots` - 1)
    WHERE `id` = OLD.`course_id`;
  END IF;
END$$

DELIMITER ;
