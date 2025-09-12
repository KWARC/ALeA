import { GetHistoricalSyllabusResponse } from '@stex-react/spec';
import { readFileSync, readdirSync } from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';

function extractSemesterFromString(filename: string) {
  const regex = /syllabus_(\S+)_ (\S+)\.json/;
  const match = filename.match(regex);
  if (match && match[1] && match[2]) {
    return {
      courseId: match[1],
      semester: match[2],
    };
  } else {
    return null;
  }
}

let COURSE_ID_TO_HISTORICAL: Map<string, GetHistoricalSyllabusResponse>;
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const courseId = req.query.courseId as string;
  if (!courseId) {
    res.status(400).send({ message: 'Missing courseId.' });
    return;
  }

  if (!COURSE_ID_TO_HISTORICAL) {
    COURSE_ID_TO_HISTORICAL = new Map<string, GetHistoricalSyllabusResponse>();

    const syllabusFiles = readdirSync(process.env.RECORDED_SYLLABUS_DIR);
    // Reverse the strings so that we get the recent semester first (for a course).
    syllabusFiles.reverse().forEach((filename) => {
      const match = extractSemesterFromString(filename);
      if (!match) return;
      const { courseId, semester } = match;
      const historicalData = JSON.parse(
        readFileSync(
          process.env.RECORDED_SYLLABUS_DIR + '/' + filename,
          'utf-8'
        )
      );
      if (!COURSE_ID_TO_HISTORICAL.has(courseId)) {
        COURSE_ID_TO_HISTORICAL.set(courseId, {});
      }
      COURSE_ID_TO_HISTORICAL.get(courseId)[semester] = historicalData;
    });
  }

  const courseInfo = COURSE_ID_TO_HISTORICAL.get(courseId) ?? {};
  return res.status(200).send(courseInfo);
}
