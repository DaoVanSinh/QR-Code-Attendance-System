-- V5__Add_Enrollment_Table.sql

CREATE TABLE IF NOT EXISTS `enrollment` (
  `id`         INT      NOT NULL AUTO_INCREMENT,
  `course_id`  INT      NOT NULL,
  `student_id` INT      NOT NULL,
  `enrolled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_enrollment_course_student` (`course_id`, `student_id`),
  INDEX `idx_enrollment_student` (`student_id`),
  CONSTRAINT `fk_enrollment_course`
    FOREIGN KEY (`course_id`) REFERENCES `course` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_enrollment_student`
    FOREIGN KEY (`student_id`) REFERENCES `user` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
