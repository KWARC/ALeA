import {
  Box,
  Button,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import {
  COURSE_DESCRIPTIONS,
  CourseInitEvent,
  GRADE_TO_PERCENT_LOOPUP,
  POSSIBLE_GERMAN_GRADES,
  TO_EXCLUDE,
  UserInfo,
  getUserInfo,
  reportEvent
} from '@alea/spec';
import { localStore } from '@alea/utils';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import MainLayout from '../layouts/MainLayout';

const COURSE_LIST = Object.keys(COURSE_DESCRIPTIONS).filter(
  (id) => !TO_EXCLUDE.includes(id)
);
interface GradeInfo {
  grade?: string;
  percentage?: number;
}

function gradeInfoKey(courseId: string) {
  return 'grade-' + courseId;
}

function getGradeInfoFromLocalStorage() {
  const gradeInfo: { [courseId: string]: GradeInfo } = {};
  COURSE_LIST.forEach((courseId) => {
    const gInfo = localStore?.getItem(gradeInfoKey(courseId));
    if (gInfo) gradeInfo[courseId] = JSON.parse(gInfo) ?? {};
  });
  return gradeInfo;
}

function clamp(num: number, min: number, max: number) {
  if (isNaN(num)) return undefined;
  return Math.min(Math.max(num, min), max);
}

function setGradeInfoToLocalStorage(gradeInfo: {
  [courseId: string]: GradeInfo;
}) {
  COURSE_LIST.forEach((courseId) => {
    const gInfo = gradeInfo[courseId] ?? {};
    localStore?.setItem(gradeInfoKey(courseId), JSON.stringify(gInfo));
  });
}
const MyCourseHistory = () => {
  const { locale } = useRouter();
  const { learnerModelPriming: t } = getLocaleObject({ locale });
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
  const [courseInfo, setCourseInfo] = useState<{
    [courseId: string]: GradeInfo;
  }>(getGradeInfoFromLocalStorage());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getUserInfo().then(setUserInfo);
  }, []);
  const lang = locale ?? 'en';

  if (!userInfo) {
    return (
      <MainLayout title={`${t.learnerModelPriming} | ALᴇA`}>
        {t.loginToContinue}
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`${t.learnerModelPriming} | ALᴇA`}>
      <Box maxWidth="800px" m="auto" p="10px">
        <h2>{t.learnerModelPriming}</h2>
        <p>{t.intro}</p>
        <p>{t.disclaimer}</p>
        <p>
          <b>{t.note} 1:</b> {t.note1}
        </p>
        <p>
          <b>{t.note} 2:</b> {t.note2}
        </p>
        <p>
          <b>{t.note} 3:</b> {t.note3}
        </p>
        <table>
          <tr style={{ fontSize: 'large' }}>
            <th>{t.course}</th>
            <th>
              {t.grade}
              <br />
              (1.0-5.0)
            </th>
            <th>
              {t.percentage}
              <br />
              (0-100%)
            </th>
          </tr>
          {COURSE_LIST.map((courseId, idx) => (
            <tr key={courseId} style={{ borderBottom: '1px solid #DDD' }}>
              <td>
                <b>
                  {COURSE_DESCRIPTIONS[courseId].name[lang]} ({courseId})
                </b>
                <br />
                <i>{COURSE_DESCRIPTIONS[courseId].description[lang]}</i>
                {!COURSE_DESCRIPTIONS[courseId].description[lang]?.length && (
                  <a
                    href="https://github.com/slatex/ALeA/blob/main/packages/alea-frontend/pages/learner-model-init.tsx"
                    target="_blank"
                  >
                    <b>
                      <u>Enter {courseId} description here</u>
                    </b>
                  </a>
                )}
              </td>
              <td style={{ paddingLeft: '10px' }}>
                <Select
                  value={courseInfo[courseId]?.grade ?? ''}
                  onChange={(e) => {
                    setCourseInfo((prev) => {
                      const grade = e.target.value;
                      const info = { grade };
                      const newCourseInfo = { ...prev, [courseId]: info };
                      setGradeInfoToLocalStorage(newCourseInfo);
                      return newCourseInfo;
                    });
                  }}
                  sx={{ width: '100px' }}
                  margin="dense"
                >
                  <MenuItem key={'empty'} value={''}>
                    {'N/A'}
                  </MenuItem>
                  {POSSIBLE_GERMAN_GRADES.map((v) => (
                    <MenuItem key={v} value={v}>
                      {v}&nbsp;
                      <span style={{ fontSize: '10px', color: 'grey' }}>
                        ({GRADE_TO_PERCENT_LOOPUP[v]}%)
                      </span>
                    </MenuItem>
                  ))}
                </Select>
              </td>
              <td>
                <TextField
                  value={courseInfo[courseId]?.percentage ?? ''}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">%</InputAdornment>
                    ),
                  }}
                  type="number"
                  onChange={(e) => {
                    setCourseInfo((prev) => {
                      const perc = clamp(parseFloat(e.target.value), 0, 100);
                      const info = { percentage: perc };
                      const newCourseInfo = { ...prev, [courseId]: info };
                      setGradeInfoToLocalStorage(newCourseInfo);
                      return newCourseInfo;
                    });
                  }}
                  sx={{ width: '100px', m: '0' }}
                  margin="dense"
                />
              </td>
            </tr>
          ))}
        </table>
        <Button
          sx={{ mt: '10px' }}
          onClick={() => {
            if (!confirm(t.submitConfirmation)) return;
            const promises = COURSE_LIST.map((courseId) => {
              const course = courseInfo[courseId];
              const grade = course?.grade;
              const percentage = course?.percentage;
              if (!grade && !percentage) return;
              const event: CourseInitEvent = { type: 'course-init', course: courseId };
              if (grade) event.grade = grade;
              if (percentage) event.percentage = percentage.toString();
              return reportEvent(event);
            }).filter((x) => x);
            setIsLoading(true);
            Promise.all(promises).then(() => {
              setIsLoading(false);
              alert(t.submitSuccess);
            });
          }}
          disabled={isLoading}
          variant="contained"
        >
          {t.submit}
        </Button>
        {isLoading && <p>Submitting data. This can take upto 5 min.</p>}
      </Box>
    </MainLayout>
  );
};

export default MyCourseHistory;
