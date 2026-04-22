ALTER TABLE session
ADD COLUMN previous_qr_code VARCHAR(500) NULL AFTER qr_code;
