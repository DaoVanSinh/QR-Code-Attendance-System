package com.qrcode.backend.repository;

import com.qrcode.backend.entity.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, Integer> {
    List<Course> findByTeacherId(Integer teacherId);

    long countBySubjectId(Integer subjectId);
    List<Course> findBySubjectId(Integer subjectId);

    @Query("SELECT c FROM Course c WHERE c.dayOfWeek = :dow " +
           "AND LOWER(c.room) = LOWER(:room) " +
           "AND c.startLesson <= :endLesson " +
           "AND c.endLesson >= :startLesson " +
           "AND (:excludeId IS NULL OR c.id <> :excludeId)")
    List<Course> findConflictingCourses(
        @Param("dow") Integer dayOfWeek,
        @Param("room") String room,
        @Param("startLesson") Integer startLesson,
        @Param("endLesson") Integer endLesson,
        @Param("excludeId") Integer excludeId
    );
    /**
     * Tìm các môn SV đã đăng ký (ACTIVE) mà KHÔNG có Schedule record nào.
     * Dùng để check trùng lịch bằng legacy fields (dayOfWeek, startLesson, endLesson).
     */
    @Query("SELECT c FROM Course c " +
           "JOIN Enrollment e ON e.course.id = c.id " +
           "WHERE e.student.id = :studentId " +
           "AND e.status = com.qrcode.backend.entity.enums.EnrollmentStatus.ACTIVE " +
           "AND c.id <> :excludeCourseId " +
           "AND c.schedules IS EMPTY")
    List<Course> findEnrolledByStudentWithoutSchedule(
        @Param("studentId") Integer studentId,
        @Param("excludeCourseId") Integer excludeCourseId
    );
}
