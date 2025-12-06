import DownloadIcon from '@mui/icons-material/Download';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import {
  Box,
  IconButton,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
} from '@mui/material';
import { GetHistoricalSyllabusResponse, SectionInfo, SyllabusRow } from '@alea/spec';
import { MystViewer } from '@alea/myst';
import axios from 'axios';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useCurrentTermContext } from '../contexts/CurrentTermContext';
import { getLocaleObject } from '../lang/utils';

function joinerForLevel(level: number) {
  switch (level) {
    case 0:
      return '\n\n';
    case 1:
      return '\\\n';
    default:
      return ', ';
  }
}

function sectionTitleWithFormatting(title: string, level: number) {
  switch (level) {
    case 0:
      return `**${title.toUpperCase()}**`;
    case 1:
      return `**${title}**`;
    default:
      return title;
  }
}

function joinSectionWithChildren(parent: string, parentLevel: number, children: string) {
  const formattedParent = sectionTitleWithFormatting(parent, parentLevel);
  switch (parentLevel) {
    case 0:
      return `${formattedParent}\\\n${children}`;
    case 1:
      return `${formattedParent}\\\n${children}`;
    default:
      return `${formattedParent} (${children})`;
  }
}

function getLectureClipIds(sections: SectionInfo[], clipIds: { [timestamp_ms: number]: string }) {
  for (const s of sections) {
    if (s.clipId?.length) clipIds[s.timestamp_ms] = s.clipId;
    getLectureClipIds(s.children, clipIds);
  }
}

function createAndPush(
  obj: { [timestamp_ms: number]: string[] },
  timestamp_ms: number,
  val: string
) {
  if (!obj[timestamp_ms]) obj[timestamp_ms] = [];
  obj[timestamp_ms].push(val);
}
function getLectureDescs(sections: SectionInfo[]): {
  [timestamp_ms: number]: string;
} {
  const descPieces: { [timestamp_ms: number]: string[] } = {};
  for (const section of sections) {
    const { title, level, timestamp_ms } = section;
    if (!timestamp_ms) break;

    const secInfo = getLectureDescs(section.children);
    let addedForThis = false;

    for (const childTimestamp_ms of Object.keys(secInfo).map((n) => +n)) {
      const childDesc = secInfo[childTimestamp_ms];
      if (childDesc?.length) {
        const piece = joinSectionWithChildren(title, level, childDesc);
        createAndPush(descPieces, childTimestamp_ms, piece);
        if (childTimestamp_ms === timestamp_ms) addedForThis = true;
      }
    }

    if (!addedForThis) {
      const piece = sectionTitleWithFormatting(title, level);
      createAndPush(descPieces, timestamp_ms, piece);
    }
  }

  const descriptions: { [timestamp_ms: number]: string } = {};
  for (const timestamp_ms of Object.keys(descPieces)) {
    const pieces = descPieces[timestamp_ms];
    const isJoined = pieces.some((piece) => piece.includes(',') || piece.includes('\n'));
    const joiner = isJoined ? joinerForLevel(sections[0]?.level) : ', ';
    descriptions[timestamp_ms] = pieces.join(joiner);
  }
  return descriptions;
}

function downloadSyllabusData(jsonData: any, courseId: string, semester: string) {
  // Convert JSON to string
  const jsonString = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  // Create a link element
  const link = document.createElement('a');
  link.download = `syllabus_${courseId}_ ${semester}.json`;

  // Attach the file to the link
  link.href = window.URL.createObjectURL(blob);

  // Trigger download
  link.click();
}

function SyllabusTable({
  rows,
  toShow,
  courseId,
  semester,
  currentTerm,
}: {
  rows: SyllabusRow[];
  toShow: boolean;
  courseId: string;
  semester?: string;
  currentTerm: string;
}) {
  const { courseHome: t } = getLocaleObject(useRouter());
  if (!toShow) return null;
  const hasAnyVideoClip = rows.filter((r) => r.clipId?.length > 0).length > 0;
  const showYear = semester !== currentTerm;

  return (
    <>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ textAlign: 'left' }}>{t.date}</TableCell>
            <TableCell sx={{ textAlign: 'left' }}>{t.topics}</TableCell>
            {hasAnyVideoClip && <TableCell style={{ textAlign: 'left' }}>{t.video}</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(({ timestamp_ms, topics, clipId }, idx) => (
            <TableRow key={`${timestamp_ms}`} >
              <TableCell sx={{ textAlign: 'center', minWidth: '110px' }}>
                <b>{idx + 1}.&nbsp;</b>
                {dayjs(timestamp_ms).format(showYear ? 'DD-MMM-YY' : 'DD-MMM')}
              </TableCell>
              <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'unset' }}>
                {topics ? <MystViewer content={topics} /> : 'Topics unexpectedly empty'}
              </TableCell>
              {hasAnyVideoClip && (
                <TableCell>
                  {clipId?.length > 0 && (
                    <a href={`https://fau.tv/clip/id/${clipId}`} target="_blank" rel="noreferrer">
                      <IconButton size="large" sx={{ m: '10px' }}>
                        <OndemandVideoIcon />
                      </IconButton>
                    </a>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <IconButton onClick={() => downloadSyllabusData(rows, courseId, semester ?? currentTerm)}>
        <DownloadIcon />
      </IconButton>
    </>
  );
}

export function RecordedSyllabus({ courseId }: { courseId: string }) {
  const { courseHome: t } = getLocaleObject(useRouter());
  const { currentTermByCourseId, loadingTermByCourseId } = useCurrentTermContext();
  const currentTerm = currentTermByCourseId[courseId];
  
  const [lectureDescs, setLectureDescs] = useState<{
    [timestamp_ms: number]: string;
  }>({});
  const [lectureClipIds, setLectureClipIds] = useState<{
    [timestamp_ms: number]: string;
  }>({});
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);
  const [historicalSyllabus, setHistoricalSyllabus] = useState<GetHistoricalSyllabusResponse>({});

  useEffect(() => {
    if (!courseId) return;
    axios.get(`/api/get-section-info/${courseId}`).then((resp) => {
      setLectureDescs(getLectureDescs(resp.data));

      const clipIds = {};
      getLectureClipIds(resp.data, clipIds);
      setLectureClipIds(clipIds);
    });
  }, [courseId]);

  useEffect(() => {
    if (!courseId) return;
    axios.get(`/api/get-historical-syllabus/${courseId}`).then((resp) => {
      setHistoricalSyllabus(resp.data);
    });
  }, [courseId]);

  if (!courseId || loadingTermByCourseId) return null;
  const timestamps = Object.keys(lectureDescs)
    .map((n) => +n)
    .sort();

  const currentSemRows = timestamps.map((timestamp_ms) => ({
    timestamp_ms,
    topics: lectureDescs[timestamp_ms],
    clipId: lectureClipIds[timestamp_ms],
  }));

  const previousSems = Object.keys(historicalSyllabus);
  const showCurrent = currentSemRows.length > 0;
  if (!showCurrent && previousSems.length == 0) return null;
  return (
    <Box>
      <Box textAlign="center">
        <b style={{ fontSize: '24px' }}>{t.recordedSyllabus}</b>
      </Box>
      <Box mt="10px">
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={selectedTabIndex}
              onChange={(event: React.SyntheticEvent, newValue: number) =>
                setSelectedTabIndex(newValue)
              }
            >
              {showCurrent && <Tab label={<b>{t.currentSemester}</b>} />}
              {previousSems.map((semester) => (
                <Tab key={semester} label={<b>{semester}</b>} />
              ))}
            </Tabs>
          </Box>
          {showCurrent && (
            <SyllabusTable
              rows={currentSemRows}
              toShow={selectedTabIndex === 0}
              courseId={courseId}
              currentTerm={currentTerm}
            />
          )}
          {previousSems.map((semester, idx) => (
            <SyllabusTable
              key={semester}
              rows={historicalSyllabus[semester]}
              toShow={selectedTabIndex === idx + (showCurrent ? 1 : 0)}
              courseId={courseId}
              semester={semester}
              currentTerm={currentTerm}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
