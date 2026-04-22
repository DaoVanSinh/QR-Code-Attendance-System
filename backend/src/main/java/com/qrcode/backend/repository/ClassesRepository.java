package com.qrcode.backend.repository;

import com.qrcode.backend.entity.Classes;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClassesRepository extends JpaRepository<Classes, Integer> {
    Optional<Classes> findByName(String name);
}
