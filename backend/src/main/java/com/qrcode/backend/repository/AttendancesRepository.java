package com.qrcode.backend.repository;

import com.qrcode.backend.entity.Attendances;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttendancesRepository extends JpaRepository<Attendances, Integer> {
    boolean existsBySessionIdAndStudentId(Integer sessionId, Integer studentId);
    List<Attendances> findBySessionId(Integer sessionId);
    List<Attendances> findByStudentIdOrderByCheckInTimeDesc(Integer studentId);
    int countBySessionId(Integer sessionId);

    /**
     * Đếm số bản ghi attendance của tất cả session thuộc 1 course.
     * Dùng để kiểm tra Data Integrity trước khi xóa/sửa course.
     */
    @Query("SELECT COUNT(a) FROM Attendances a WHERE a.session.course.id = :courseId")
    long countBySessionCoursId(@Param("courseId") Integer courseId);
}

