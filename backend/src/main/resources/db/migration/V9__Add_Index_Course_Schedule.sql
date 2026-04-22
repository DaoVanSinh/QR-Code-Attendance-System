-- Thêm composite index cho truy vấn kiểm tra trùng lịch phòng học
-- Index trên (day_of_week, room, start_lesson, end_lesson) giúp query findConflictingCourses() nhanh hơn
CREATE INDEX idx_course_schedule 
    ON course (day_of_week, room, start_lesson, end_lesson);

