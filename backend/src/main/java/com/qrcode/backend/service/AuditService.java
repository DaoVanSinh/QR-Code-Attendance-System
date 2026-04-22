package com.qrcode.backend.service;

import com.qrcode.backend.entity.Logs;
import com.qrcode.backend.entity.User;
import com.qrcode.backend.repository.LogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final LogRepository logRepository;

    public void logAction(User user, String action, String actionText) {
        Logs logs = Logs.builder()
                .user(user)
                .action(action)
                .actionText(actionText)
                .build();
        logRepository.save(logs);
    }
}
