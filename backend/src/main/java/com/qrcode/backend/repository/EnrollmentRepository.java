package com.qrcode.backend.repository;

import com.qrcode.backend.entity.Enrollment;
import com.qrcode.backend.entity.enums.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Integer> {
    List<Enrollment> findByStudentId(Integer studentId);
    boolean existsByCourseIdAndStudentId(Integer courseId, Integer studentId);
    Optional<Enrollment> findByCourseIdAndStudentId(Integer courseId, Integer studentId);
    void deleteByCourseIdAndStudentId(Integer courseId, Integer studentId);
    List<Enrollment> findByCourseId(Integer courseId);

    /**
     * Đếm số enrollment ACTIVE của 1 course (dùng cho check sĩ số).
     */
    long countByCourseIdAndStatus(Integer courseId, EnrollmentStatus status);

    /**
     * Lấy enrollment list với PESSIMISTIC_WRITE lock — chống race condition.
     * Khi 2 SV cùng đăng ký 1 chỗ cuối cùng, chỉ 1 người được lock.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Enrollment e WHERE e.course.id = :courseId AND e.status = :status")
    List<Enrollment> findByCourseIdAndStatusForUpdate(
        @Param("courseId") Integer courseId,
        @Param("status") EnrollmentStatus status
    );

    /**
     * Lấy enrollment ACTIVE của SV trong 1 kỳ (dùng cho check trùng lịch).
     */
    @Query("SELECT e FROM Enrollment e WHERE e.student.id = :studentId " +
           "AND e.status = com.qrcode.backend.entity.enums.EnrollmentStatus.ACTIVE " +
           "AND (:semesterId IS NULL OR e.course.semesterEntity.id = :semesterId)")
    List<Enrollment> findActiveByStudentAndSemester(
        @Param("studentId") Integer studentId,
        @Param("semesterId") Integer semesterId
    );
}

