import { CoverageTimeline, CURRENT_TERM, Holiday, semesterPeriods } from '@stex-react/utils';
import { writeFile } from 'fs/promises';

function isHoliday(date: Date, holidays: Holiday[]) {
  const dateString = date.toISOString().split('T')[0];
  return holidays.some((h) => h.date === dateString);
}

function currentSemSetup() {
  const sem = semesterPeriods[CURRENT_TERM];
  if (!sem) throw new Error(`Semester ${CURRENT_TERM} not found in semesterPeriods.`);
  const holidays = sem.holidays;
  const startDate = new Date(sem.lectureStart);
  const endDate = new Date(sem.lectureEnd);
  const courses = sem.courses;

  const lectureEntriesByCourse: CoverageTimeline = {};
  courses.forEach((c) => (lectureEntriesByCourse[c.courseId] = []));
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isHoliday(currentDate, holidays)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }
    const day = currentDate.getDay();
    for (const course of courses) {
      if (course.dayOfWeek !== day) continue;
      const lectureDate = new Date(currentDate);
      const [startHours, startMinutes] = course.startTime.split(':').map(Number);
      lectureDate.setHours(startHours, startMinutes, 0, 0);
      const timestamp_ms = lectureDate.getTime();

      const lectureEndDate = new Date(currentDate);
      const [endHours, endMinutes] = course.endTime.split(':').map(Number);
      lectureEndDate.setHours(endHours, endMinutes, 0, 0);
      const lectureEndTimestamp_ms = lectureEndDate.getTime();

      lectureEntriesByCourse[course.courseId].push({
        timestamp_ms,
        sectionUri: '',
        targetSectionUri: '',
        clipId: '',
        isQuizScheduled: false,
        slideUri: '',
        lectureEndTimestamp_ms,
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return lectureEntriesByCourse;
}

export async function currentSemSetupScript() {
  const lectureEntries = currentSemSetup();
  const outputPath = process.env.RECORDED_SYLLABUS_DIR + '/current-sem.json';
  try {
    await writeFile(outputPath, JSON.stringify(lectureEntries, null, 2));
    console.log(`Coverage data written to ${outputPath}`);
  } catch (e) {
    console.error(`Could not write to ${outputPath}. Error: ${e}`);
  }
}
