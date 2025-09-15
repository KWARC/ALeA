import { readFile, writeFile } from 'fs/promises';
import { semesterPeriods } from '@alea/utils';

export interface CourseScheduleInfo {
  lectureStart: string;
  lectureEnd: string;
}

export const courseSchedule: Record<string, CourseScheduleInfo> = {
  krmt: {
    lectureStart: '12:15',
    lectureEnd: '13:45',
  },
  smai: {
    lectureStart: '10:15',
    lectureEnd: '11:50',
  },
  'ai-2': {
    lectureStart: '16:15',
    lectureEnd: '17:50',
  },
  'iwgs-2': {
    lectureStart: '16:15',
    lectureEnd: '17:50',
  },
};

export const defaultSchedule: CourseScheduleInfo = {
  lectureStart: '16:15',
  lectureEnd: '17:50',
};

const CURRENT_SEM_FILE = process.env.RECORDED_SYLLABUS_DIR + '/current-sem.json';

export async function addScheduleInfoToCurrentSem() {
  try {
    const data = await readFile(CURRENT_SEM_FILE, 'utf-8');
    const json = JSON.parse(data);
    console.log({ json });
    for (const courseId of Object.keys(json)) {
      if (Array.isArray(json[courseId])) {
        const schedule = courseSchedule[courseId] || defaultSchedule;
        const currentSemCourses = semesterPeriods.SS25.courses;
        const courseVenueInfo = currentSemCourses.find((c) => c.courseId === courseId);
        json[courseId] = json[courseId].map((entry: any) => {
          const lectureDate = new Date(entry.timestamp_ms);

          const [startHours, startMinutes] = schedule.lectureStart.split(':').map(Number);
          const startDate = new Date(lectureDate);
          startDate.setHours(startHours, startMinutes, 0, 0);

          const [endHours, endMinutes] = schedule.lectureEnd.split(':').map(Number);
          const endDate = new Date(lectureDate);
          endDate.setHours(endHours, endMinutes, 0, 0);

          return {
            ...entry,
            timestamp_ms: startDate.getTime(),
            lectureEndTimestamp_ms: endDate.getTime(),
            venue: courseVenueInfo?.venue,
            venueLink: courseVenueInfo?.venueLink,
          };
        });
      }
    }
    await writeFile(CURRENT_SEM_FILE, JSON.stringify(json, null, 2), 'utf-8');
    console.log('Successfully updated current-sem.json with schedule info.');
  } catch (error) {
    console.error('Failed to update current-sem.json:', error);
  }
}

export async function addLectureSchedule() {
  await addScheduleInfoToCurrentSem();
}
