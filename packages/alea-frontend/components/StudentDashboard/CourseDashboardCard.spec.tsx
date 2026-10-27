import { createCourseInfo } from '@alea/utils';
import { render, screen } from '@testing-library/react';
import { CourseDashboardCard } from './CourseDashboardCard';

jest.mock('next/router', () => ({
  useRouter: () => ({ locale: 'en' }),
}));

describe('CourseDashboardCard navigation', () => {
  test.each([
    {
      name: 'moves unavailable items below enabled items',
      hasQuiz: false,
      hasHomework: false,
      hasCheatsheet: false,
      expected: ['Notes', 'Slides', 'Quiz schedule', 'Assignments', 'Cheatsheet'],
    },
    {
      name: 'preserves the order within enabled and disabled items',
      hasQuiz: false,
      hasHomework: true,
      hasCheatsheet: true,
      expected: ['Assignments', 'Notes', 'Slides', 'Cheatsheet', 'Quiz schedule'],
    },
    {
      name: 'keeps the original order when every item is enabled',
      hasQuiz: true,
      hasHomework: true,
      hasCheatsheet: true,
      expected: ['Quiz schedule', 'Assignments', 'Notes', 'Slides', 'Cheatsheet'],
    },
  ])('$name', ({ hasQuiz, hasHomework, hasCheatsheet, expected }) => {
    render(
      <CourseDashboardCard
        courseId="ai-1"
        courseName="Artificial Intelligence I"
        institutionId="FAU"
        instance="WS26-27"
        isLoading={false}
        courseInfo={createCourseInfo(
          'ai-1',
          'Artificial Intelligence I',
          '',
          '',
          true,
          hasQuiz,
          hasHomework,
          { hasCheatsheet }
        )}
        data={{
          courseId: 'ai-1',
          hasQuiz,
          hasHomework,
          liveQuiz: null,
          upcomingQuiz: null,
          nextHomework: null,
          nextLectureTs: null,
          nextTutorialTs: null,
          isSemesterOver: false,
        }}
      />
    );

    expect(
      screen
        .getAllByText(/^(Quiz schedule|Assignments|Notes|Slides|Cheatsheet)$/)
        .map((item) => item.textContent)
    ).toEqual(expected);
  });
});
