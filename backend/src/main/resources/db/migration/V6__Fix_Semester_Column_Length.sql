-- V6__Fix_Semester_Column_Length.sql

ALTER TABLE `course` MODIFY COLUMN `semester` VARCHAR(100) NOT NULL;
