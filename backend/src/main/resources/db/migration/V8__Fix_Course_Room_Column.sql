-- Đổi tên cột oom bị sai chính tả thành room
ALTER TABLE course CHANGE COLUMN oom room VARCHAR(50) NULL;
