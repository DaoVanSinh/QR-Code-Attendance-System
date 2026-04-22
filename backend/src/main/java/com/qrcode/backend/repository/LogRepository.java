package com.qrcode.backend.repository;

import com.qrcode.backend.entity.Logs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LogRepository extends JpaRepository<Logs, Integer> {
}
