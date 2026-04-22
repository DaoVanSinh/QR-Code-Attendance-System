-- Thêm lịch học và xóa slug ở Subject
ALTER TABLE subject DROP COLUMN slug;
ALTER TABLE course 
    ADD COLUMN day_of_week INT NULL,
    ADD COLUMN start_lesson INT NULL,
    ADD COLUMN end_lesson INT NULL,
    ADD COLUMN 
oom VARCHAR(50) NULL;
