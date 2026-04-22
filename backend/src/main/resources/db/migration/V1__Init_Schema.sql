-- V1__Init_Schema.sql

CREATE TABLE IF NOT EXISTS `user` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `email`       VARCHAR(255) NOT NULL,
  `password`    VARCHAR(255) NOT NULL,
  `role`        ENUM('ADMIN','TEACHER','STUDENT') NOT NULL DEFAULT 'STUDENT',
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `profile` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `user_id`   INT          NOT NULL,
  `full_name` VARCHAR(255) NOT NULL,
  `phone`     VARCHAR(20)      DEFAULT NULL,
  `avatar`    VARCHAR(500)     DEFAULT NULL,
  `status`    ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profile_user` (`user_id`),
  CONSTRAINT `fk_profile_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Học Thuật
CREATE TABLE IF NOT EXISTS `subject` (
  `id`   INT          NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50)  NOT NULL,
  `slug` VARCHAR(255) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_subject_code` (`code`),
  UNIQUE KEY `uq_subject_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `classes` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(255) NOT NULL,
  `code`       VARCHAR(50)  NOT NULL,
  `subject_id` INT          NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_classes_code` (`code`),
  CONSTRAINT `fk_classes_subject`
    FOREIGN KEY (`subject_id`) REFERENCES `subject` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `course` (
  `id`         INT         NOT NULL AUTO_INCREMENT,
  `subject_id` INT         NOT NULL,
  `teacher_id` INT         NOT NULL,
  `classes_id` INT         NOT NULL,
  `semester`   VARCHAR(20) NOT NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_course_composite` (`subject_id`, `teacher_id`, `classes_id`, `semester`),
  CONSTRAINT `fk_course_subject`
    FOREIGN KEY (`subject_id`) REFERENCES `subject` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_course_teacher`
    FOREIGN KEY (`teacher_id`) REFERENCES `user` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_course_classes`
    FOREIGN KEY (`classes_id`) REFERENCES `classes` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Điểm danh
CREATE TABLE IF NOT EXISTS `session` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `course_id`  INT          NOT NULL,
  `start_time` DATETIME     NOT NULL,
  `end_time`   DATETIME     NOT NULL,
  `qr_code`    VARCHAR(500)     DEFAULT NULL,
  `expired_at` DATETIME         DEFAULT NULL,

  PRIMARY KEY (`id`),
  INDEX `idx_session_course` (`course_id`),
  CONSTRAINT `fk_session_course`
    FOREIGN KEY (`course_id`) REFERENCES `course` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS `attendances` (
  `id`            INT      NOT NULL AUTO_INCREMENT,
  `session_id`    INT      NOT NULL,
  `student_id`    INT      NOT NULL,
  `check_in_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendances_session_student` (`session_id`, `student_id`),
  CONSTRAINT `fk_attendances_session`
    FOREIGN KEY (`session_id`) REFERENCES `session` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_attendances_student`
    FOREIGN KEY (`student_id`) REFERENCES `user` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Audit
CREATE TABLE IF NOT EXISTS `logs` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `user_id`     INT          NOT NULL,
  `action`      VARCHAR(100) NOT NULL,
  `action_text` TEXT             DEFAULT NULL,
  `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  INDEX `idx_logs_user`    (`user_id`),
  INDEX `idx_logs_created` (`created_at`),
  CONSTRAINT `fk_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
