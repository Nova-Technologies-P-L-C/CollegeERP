-- CreateIndex
CREATE INDEX "Admission_status_programLevel_idx" ON "Admission"("status", "programLevel");

-- CreateIndex
CREATE INDEX "Admission_email_idx" ON "Admission"("email");

-- CreateIndex
CREATE INDEX "Admission_applicationDate_idx" ON "Admission"("applicationDate");

-- CreateIndex
CREATE INDEX "Announcement_date_idx" ON "Announcement"("date");

-- CreateIndex
CREATE INDEX "Announcement_audience_idx" ON "Announcement"("audience");

-- CreateIndex
CREATE INDEX "Announcement_targetDepartment_targetSemester_idx" ON "Announcement"("targetDepartment", "targetSemester");

-- CreateIndex
CREATE INDEX "Attendance_studentId_idx" ON "Attendance"("studentId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_status_idx" ON "Attendance"("status");

-- CreateIndex
CREATE INDEX "Attendance_studentId_status_idx" ON "Attendance"("studentId", "status");

-- CreateIndex
CREATE INDEX "Attendance_courseId_date_idx" ON "Attendance"("courseId", "date");

-- CreateIndex
CREATE INDEX "Course_assignedFaculty_idx" ON "Course"("assignedFaculty");

-- CreateIndex
CREATE INDEX "Course_assignedFacultyMorning_idx" ON "Course"("assignedFacultyMorning");

-- CreateIndex
CREATE INDEX "Course_assignedFacultyEvening_idx" ON "Course"("assignedFacultyEvening");

-- CreateIndex
CREATE INDEX "Course_department_semester_idx" ON "Course"("department", "semester");

-- CreateIndex
CREATE INDEX "Course_programLevel_semester_idx" ON "Course"("programLevel", "semester");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_idx" ON "Enrollment"("studentId");

-- CreateIndex
CREATE INDEX "Enrollment_studentId_semester_idx" ON "Enrollment"("studentId", "semester");

-- CreateIndex
CREATE INDEX "Fee_status_idx" ON "Fee"("status");

-- CreateIndex
CREATE INDEX "Fee_dueDate_idx" ON "Fee"("dueDate");

-- CreateIndex
CREATE INDEX "Fee_studentId_semester_idx" ON "Fee"("studentId", "semester");

-- CreateIndex
CREATE INDEX "Fee_studentId_status_idx" ON "Fee"("studentId", "status");

-- CreateIndex
CREATE INDEX "Feedback_targetId_type_idx" ON "Feedback"("targetId", "type");

-- CreateIndex
CREATE INDEX "Grade_studentId_courseId_idx" ON "Grade"("studentId", "courseId");

-- CreateIndex
CREATE INDEX "Quiz_courseId_status_idx" ON "Quiz"("courseId", "status");

-- CreateIndex
CREATE INDEX "Quiz_status_idx" ON "Quiz"("status");

-- CreateIndex
CREATE INDEX "QuizAttempt_studentId_quizId_idx" ON "QuizAttempt"("studentId", "quizId");

-- CreateIndex
CREATE INDEX "Student_programLevel_status_idx" ON "Student"("programLevel", "status");

-- CreateIndex
CREATE INDEX "Student_department_semester_idx" ON "Student"("department", "semester");

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");

-- CreateIndex
CREATE INDEX "Student_department_idx" ON "Student"("department");

-- CreateIndex
CREATE INDEX "Student_semester_idx" ON "Student"("semester");

-- CreateIndex
CREATE INDEX "Timetable_shift_idx" ON "Timetable"("shift");

-- CreateIndex
CREATE INDEX "Timetable_day_idx" ON "Timetable"("day");

-- CreateIndex
CREATE INDEX "Timetable_courseId_shift_idx" ON "Timetable"("courseId", "shift");
