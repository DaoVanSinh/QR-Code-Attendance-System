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

    /**
     * Kiểm tra sinh viên đã điểm danh ít nhất 1 lần trong 1 course chưa.
     * Dùng khi hủy đăng ký học phần.
     */
    @Query("SELECT CASE WHEN COUNT(a) > 0 THEN true ELSE false END FROM Attendances a WHERE a.session.course.id = :courseId AND a.student.id = :studentId")
    boolean existsBySessionCourseIdAndStudentId(@Param("courseId") Integer courseId, @Param("studentId") Integer studentId);
}

