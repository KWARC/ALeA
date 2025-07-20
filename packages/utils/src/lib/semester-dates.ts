export interface Holiday {
  date: string;
  name: string;
}

interface Course {
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  venue?: string;
  venueLink?: string;
}
export interface SemesterPeriod {
  semesterStart: string;
  semesterEnd: string;
  lectureStart: string;
  lectureEnd: string;
  holidays: Holiday[];
  courses: Course[];
  examDates: { courseId: string; examDate: string; examStartTime: string; examEndTime: string }[];
}

export const semesterPeriods: Record<string, SemesterPeriod> = {
  SS25: {
    semesterStart: '2025-04-01',
    semesterEnd: '2025-09-30',
    lectureStart: '2025-04-23',
    lectureEnd: '2025-07-25',
    holidays: [
      { date: '2025-04-18', name: 'Good Friday' },
      { date: '2025-04-21', name: 'Easter Monday' },
      { date: '2025-05-01', name: 'Labour Day' },
      { date: '2025-05-29', name: 'Ascension Day' },
      { date: '2025-06-09', name: 'Whit Monday' },
      { date: '2025-06-10', name: 'No lecture' },
      { date: '2025-06-19', name: 'Feast of Corpus Christi' },
      { date: '2025-06-20', name: 'No Lecture' },
    ],
    courses: [
      {
        courseId: 'krmt',
        dayOfWeek: 2,
        startTime: '12:15',
        endTime: '13:45',
        venue: 'H15',
        venueLink:
          'https://www.campo.fau.de:443/qisserver/pages/startFlow.xhtml?_flowId=roomSchedule-flow&roomId=5095&roomType=3&currentTermId=564&time=&navigationPosition=organisation,hisinoneFacilities,hisinonesearchroom',
      },
      {
        courseId: 'smai',
        dayOfWeek: 2,
        startTime: '10:15',
        endTime: '11:50',
        venue: 'H20',
        venueLink:
          'https://www.campo.fau.de:443/qisserver/pages/startFlow.xhtml?_flowId=showRoomDetail-flow&roomId=7761&roomType=3&context=showRoomDetails&navigationPosition=organisation,searchroom',
      },
      {
        courseId: 'ai-2',
        dayOfWeek: 2,
        startTime: '16:15',
        endTime: '17:50',
        venue: 'H18',
        venueLink:
          'https://www.campo.fau.de:443/qisserver/pages/startFlow.xhtml?_flowId=showRoomDetail-flow&roomId=7785&roomType=3&context=showRoomDetails',
      },
      {
        courseId: 'ai-2',
        dayOfWeek: 3,
        startTime: '16:15',
        endTime: '17:50',
        venue: 'H20',
        venueLink:
          'https://www.campo.fau.de:443/qisserver/pages/startFlow.xhtml?_flowId=showRoomDetail-flow&roomId=7761&roomType=3&context=showRoomDetails&navigationPosition=organisation,searchroom',
      },
      {
        courseId: 'iwgs-2',
        dayOfWeek: 4,
        startTime: '16:15',
        endTime: '17:50',
        venue: 'KH 0.023 Lecture Hall Kollegienhaus',
        venueLink:
          'https://www.campo.fau.de:443/qisserver/pages/startFlow.xhtml?_flowId=showRoomDetail-flow&roomId=67&roomType=3&context=showRoomDetails&navigationPosition=organisation,searchroom',
      },
    ],
    examDates: [
      /*{ courseId: 'krmt', examDate: '2025-07-28', examStartTime: '', examEndTime: '' },
      { courseId: 'smai', examDate: '2025-07-22', examStartTime: '', examEndTime: '' },
      { courseId: 'ai-2', examDate: '2025-07-30', examStartTime: '', examEndTime: '' },
      { courseId: 'iwgs-2', examDate: '2025-07-24', examStartTime: '', examEndTime: '' },*/
    ],
  },
  'WS25-26': {
    semesterStart: '2025-10-01',
    semesterEnd: '2026-03-31',
    lectureStart: '2025-10-13',
    lectureEnd: '2026-02-06',
    holidays: [
      { date: '2025-10-03', name: 'Day of German Unity' },
      { date: '2025-11-01', name: 'All Saints Day' },
    ],
    courses: [],
    examDates: [],
  },
};
