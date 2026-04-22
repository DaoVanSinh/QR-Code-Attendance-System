package com.qrcode.backend.repository;

import com.qrcode.backend.entity.Semester;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, Integer> {

    List<Semester> findAllByOrderBySchoolYearDescNameAsc();

    List<Semester> findByIsActiveTrue();
}
