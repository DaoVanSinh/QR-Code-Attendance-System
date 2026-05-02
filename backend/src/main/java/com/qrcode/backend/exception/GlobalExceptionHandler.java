package com.qrcode.backend.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleNotFound(ResourceNotFoundException ex) {
        return createResponse(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(TokenExpiredException.class)
    public ResponseEntity<Map<String, String>> handleTokenExpired(TokenExpiredException ex) {
        return createResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(DuplicateAttendanceException.class)
    public ResponseEntity<Map<String, String>> handleDuplicateAttendance(DuplicateAttendanceException ex) {
        return createResponse(ex.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        String message = ex.getMessage() != null && !ex.getMessage().isBlank()
                ? ex.getMessage()
                : "Bạn không có quyền truy cập tài nguyên này.";
        return createResponse(message, HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
            errors.put(error.getField(), error.getDefaultMessage())
        );
        return ResponseEntity.badRequest().body(errors);
    }

    // Xử lý đúng: Method không được hỗ trợ (GET thay vì POST, etc.) → 405
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        log.warn("[405] Method not allowed: {}", ex.getMessage());
        return createResponse("Phương thức HTTP không được hỗ trợ: " + ex.getMethod(), HttpStatus.METHOD_NOT_ALLOWED);
    }

    // Xử lý đúng: Content-Type không hỗ trợ (form-urlencoded thay vì JSON, etc.) → 415
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException ex) {
        log.warn("[415] Unsupported media type: {}", ex.getMessage());
        return createResponse("Content-Type không được hỗ trợ. Vui lòng dùng application/json.", HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    // Xử lý đúng: Request body không đọc được (JSON sai cú pháp, thiếu body, etc.) → 400
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleMessageNotReadable(HttpMessageNotReadableException ex) {
        log.warn("[400] Message not readable: {}", ex.getMessage());
        return createResponse("Dữ liệu gửi lên không hợp lệ hoặc thiếu body.", HttpStatus.BAD_REQUEST);
    }

    // IllegalArgumentException: email trùng, giới tính không hợp lệ, v.v → 400
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("[400] IllegalArgument: {}", ex.getMessage());
        return createResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    // RuntimeException có message người dùng (mật khẩu sai, token không hợp lệ, v.v) → 400
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        log.warn("[400] RuntimeException: {}", ex.getMessage());
        return createResponse(ex.getMessage(), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGenericException(Exception ex) {
        log.error("[500] Unhandled exception: {}", ex.getMessage(), ex);
        return createResponse("Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private ResponseEntity<Map<String, String>> createResponse(String message, HttpStatus status) {
        Map<String, String> response = new HashMap<>();
        response.put("error", message);
        return new ResponseEntity<>(response, status);
    }
}
