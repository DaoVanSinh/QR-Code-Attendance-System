package com.qrcode.backend.repository;

import com.qrcode.backend.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduleRepository extends JpaRepository<Schedule, Integer> {

    List<Schedule> findByCourseId(Integer courseId);

    /**
     * Tìm xung đột phòng: cùng phòng, cùng thứ, tiết giao nhau.
     * Overlap rule: start1 <= end2 AND end1 >= start2
     */
    @Query("SELECT s FROM Schedule s WHERE LOWER(s.room) = LOWER(:room) " +
           "AND s.dayOfWeek = :dow " +
           "AND s.startPeriod <= :endPeriod " +
           "AND s.endPeriod >= :startPeriod " +
           "AND (:excludeCourseId IS NULL OR s.course.id <> :excludeCourseId)")
    List<Schedule> findRoomConflicts(
        @Param("room") String room,
        @Param("dow") Integer dayOfWeek,
        @Param("startPeriod") Integer startPeriod,
        @Param("endPeriod") Integer endPeriod,
        @Param("excludeCourseId") Integer excludeCourseId
    );

    /**
     * Tìm xung đột giảng viên: cùng GV, cùng thứ, tiết giao nhau.
     */
    @Query("SELECT s FROM Schedule s WHERE s.course.teacher.id = :teacherId " +
           "AND s.dayOfWeek = :dow " +
           "AND s.startPeriod <= :endPeriod " +
           "AND s.endPeriod >= :startPeriod " +
           "AND (:excludeCourseId IS NULL OR s.course.id <> :excludeCourseId)")
    List<Schedule> findTeacherConflicts(
        @Param("teacherId") Integer teacherId,
        @Param("dow") Integer dayOfWeek,
        @Param("startPeriod") Integer startPeriod,
        @Param("endPeriod") Integer endPeriod,
        @Param("excludeCourseId") Integer excludeCourseId
    );

    /**
     * Lấy tất cả schedule của các môn sinh viên đã đăng ký (ACTIVE) trong kỳ.
     */
    @Query("SELECT s FROM Schedule s " +
           "JOIN Enrollment e ON e.course.id = s.course.id " +
           "LEFT JOIN s.course c " +
           "LEFT JOIN c.semesterEntity sem " +
           "WHERE e.student.id = :studentId " +
           "AND e.status = com.qrcode.backend.entity.enums.EnrollmentStatus.ACTIVE " +
           "AND (:semesterId IS NULL OR sem.id = :semesterId)")
    List<Schedule> findByStudentEnrolled(
        @Param("studentId") Integer studentId,
        @Param("semesterId") Integer semesterId
    );

    /**
     * Lấy tất cả schedule của giảng viên trong kỳ.
     * Dùng LEFT JOIN để cả courses chưa có semesterEntity vẫn được lấy khi semesterId=null.
     */
    @Query("SELECT s FROM Schedule s " +
           "LEFT JOIN s.course c " +
           "LEFT JOIN c.semesterEntity sem " +
           "WHERE c.teacher.id = :teacherId " +
           "AND (:semesterId IS NULL OR sem.id = :semesterId)")
    List<Schedule> findByTeacher(
        @Param("teacherId") Integer teacherId,
        @Param("semesterId") Integer semesterId
    );

    /**
     * Lấy tất cả schedule trong kỳ (admin view).
     */
    @Query("SELECT s FROM Schedule s " +
           "LEFT JOIN s.course c " +
           "LEFT JOIN c.semesterEntity sem " +
           "WHERE (:semesterId IS NULL OR sem.id = :semesterId)")
    List<Schedule> findBySemester(@Param("semesterId") Integer semesterId);

    /**
     * Kiểm tra trùng lịch cá nhân sinh viên:
     * Tìm schedule của các môn SV đã đăng ký mà giao nhau với lịch mới.
     */
    @Query("SELECT s FROM Schedule s " +
           "JOIN Enrollment e ON e.course.id = s.course.id " +
           "WHERE e.student.id = :studentId " +
           "AND e.status = com.qrcode.backend.entity.enums.EnrollmentStatus.ACTIVE " +
           "AND s.dayOfWeek = :dow " +
           "AND s.startPeriod <= :endPeriod " +
           "AND s.endPeriod >= :startPeriod " +
           "AND s.course.id <> :excludeCourseId")
    List<Schedule> findStudentTimeConflicts(
        @Param("studentId") Integer studentId,
        @Param("dow") Integer dayOfWeek,
        @Param("startPeriod") Integer startPeriod,
        @Param("endPeriod") Integer endPeriod,
        @Param("excludeCourseId") Integer excludeCourseId
    );
}
