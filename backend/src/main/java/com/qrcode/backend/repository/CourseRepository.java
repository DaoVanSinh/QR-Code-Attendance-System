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
}
