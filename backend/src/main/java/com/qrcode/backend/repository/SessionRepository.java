package com.qrcode.backend.repository;

import com.qrcode.backend.entity.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, Integer> {
    Optional<Session> findByQrCodeOrPreviousQrCode(String qrCode, String previousQrCode);
    Optional<Session> findByQrCode(String qrCode);
    List<Session> findByCourseIdOrderByStartTimeDesc(Integer courseId);
}
