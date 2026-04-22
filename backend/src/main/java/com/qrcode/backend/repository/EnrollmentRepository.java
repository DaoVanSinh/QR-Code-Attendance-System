package com.qrcode.backend.repository;

import com.qrcode.backend.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Integer> {
    List<Enrollment> findByStudentId(Integer studentId);
    boolean existsByCourseIdAndStudentId(Integer courseId, Integer studentId);
    Optional<Enrollment> findByCourseIdAndStudentId(Integer courseId, Integer studentId);
    void deleteByCourseIdAndStudentId(Integer courseId, Integer studentId);
    List<Enrollment> findByCourseId(Integer courseId);
}
