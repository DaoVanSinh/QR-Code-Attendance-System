ALTER TABLE user
ADD COLUMN reset_password_token VARCHAR(255) DEFAULT NULL,
ADD COLUMN reset_password_token_expiry DATETIME DEFAULT NULL;
