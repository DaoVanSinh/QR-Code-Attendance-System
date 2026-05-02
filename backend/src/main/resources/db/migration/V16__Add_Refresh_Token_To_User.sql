-- V16: Add refresh token columns to user table for persistent session management
ALTER TABLE `user`
    ADD COLUMN `refresh_token`        VARCHAR(512) DEFAULT NULL,
    ADD COLUMN `refresh_token_expiry` DATETIME     DEFAULT NULL;
