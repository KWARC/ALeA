import { Phase, QuizWithStatus } from '@stex-react/spec';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

let QUIZ_CACHE: Map<string, QuizWithStatus> | undefined = undefined;
let QUIZ_CACHE_TS: number | undefined = undefined;
const QUIZ_CACHE_TTL = 1000 * 10; // 10 sec

function isCacheValid() {
  if (!QUIZ_CACHE || !QUIZ_CACHE_TS) return false;
  return Date.now() < QUIZ_CACHE_TS + QUIZ_CACHE_TTL;
}
function refreshCacheIfNeeded() {
  if (isCacheValid()) return true;
  refreshQuizCache();
}

function refreshQuizCache() {
  console.log('\n\n\nRefreshing Cache: ' + dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss'));
  QUIZ_CACHE = new Map<string, QuizWithStatus>();
  QUIZ_CACHE_TS = Date.now();
  const quizFiles = fs.readdirSync(process.env.QUIZ_INFO_DIR);
  quizFiles.forEach((file) => {
    if (!(file.startsWith('quiz-') && file.endsWith('.json'))) return;
    const quiz = JSON.parse(
      fs.readFileSync(process.env.QUIZ_INFO_DIR + '/' + file, 'utf-8')
    ) as QuizWithStatus;
    QUIZ_CACHE.set(quiz.id, quiz);
  });
}

export function writeQuizFile(quiz: QuizWithStatus) {
  const filePath = getQuizFilePath(quiz.id);
  fs.writeFileSync(filePath, JSON.stringify(quiz, null, 2));
  invalidateQuizCache();
}

export function deleteQuizFile(quizId: string) {
  const filePath = getQuizFilePath(quizId);
  if (filePath && fs.existsSync(filePath)) {
    const deletedFilePath = `${filePath}_deleted`;
    fs.renameSync(filePath, deletedFilePath);
    invalidateQuizCache();
  }
}

export function invalidateQuizCache() {
  QUIZ_CACHE = undefined;
  QUIZ_CACHE_TS = undefined;
}

export function getAllQuizzes() {
  refreshCacheIfNeeded();
  return Array.from(QUIZ_CACHE.values());
}

export function getQuizFilePath(id: string) {
  if (!id) return undefined;
  return path.join(process.env.QUIZ_INFO_DIR, `${id}.json`);
}

export function getBackupQuizFilePath(id: string, version: number) {
  if (!id) return undefined;
  return path.join(process.env.QUIZ_INFO_DIR, `_bkp-v${version}-${id}.json`);
}

export function doesQuizExist(id: string) {
  if (!id?.length) return false;
  const quizFileName = getQuizFilePath(id);
  return fs.existsSync(quizFileName);
}

export function getQuiz(id: string) {
  refreshCacheIfNeeded();
  return QUIZ_CACHE.get(id);
}

export function getQuizTimes(q: QuizWithStatus) {
  if (q.manuallySetPhase && q.manuallySetPhase !== Phase.UNSET) return {};

  const { quizStartTs, quizEndTs, feedbackReleaseTs } = q;
  return { quizStartTs, quizEndTs, feedbackReleaseTs };
}
