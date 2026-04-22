package com.qrcode.backend.repository;

import com.qrcode.backend.entity.Attendances;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendancesRepository extends JpaRepository<Attendances, Integer> {
    boolean existsBySessionIdAndStudentId(Integer sessionId, Integer studentId);
    List<Attendances> findBySessionId(Integer sessionId);
    List<Attendances> findByStudentIdOrderByCheckInTimeDesc(Integer studentId);
    int countBySessionId(Integer sessionId);
}
