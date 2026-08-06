import { Phase, QuizWithStatus } from '@alea/spec';
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
  return true;
}

function getQuizInfoDir() {
  const quizInfoDir = process.env['QUIZ_INFO_DIR'];
  if (!quizInfoDir) throw new Error('QUIZ_INFO_DIR is not set');
  return quizInfoDir;
}

function refreshQuizCache() {
  console.log('\n\n\nRefreshing Cache: ' + dayjs(Date.now()).format('YYYY-MM-DD HH:mm:ss'));
  const nextCache = new Map<string, QuizWithStatus>();
  QUIZ_CACHE_TS = Date.now();
  const quizInfoDir = getQuizInfoDir();
  const quizFiles = fs.readdirSync(quizInfoDir);
  quizFiles.forEach((file) => {
    if (!(file.startsWith('quiz-') && file.endsWith('.json'))) return;
    const quiz = JSON.parse(fs.readFileSync(quizInfoDir + '/' + file, 'utf-8')) as QuizWithStatus;
    nextCache.set(quiz.id, quiz);
  });
  QUIZ_CACHE = nextCache;
}

export function writeQuizFile(quiz: QuizWithStatus) {
  const filePath = getQuizFilePath(quiz.id);
  if (!filePath) throw new Error('Quiz id is required');
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
  return Array.from(QUIZ_CACHE?.values() ?? []);
}

export function getQuizFilePath(id: string) {
  if (!id) return undefined;
  return path.join(getQuizInfoDir(), `${id}.json`);
}

export function getBackupQuizFilePath(id: string, version: number) {
  if (!id) return undefined;
  return path.join(getQuizInfoDir(), `_bkp-v${version}-${id}.json`);
}

export function doesQuizExist(id: string) {
  if (!id?.length) return false;
  const quizFileName = getQuizFilePath(id);
  if (!quizFileName) return false;
  return fs.existsSync(quizFileName);
}

export function getQuiz(id: string) {
  refreshCacheIfNeeded();
  return QUIZ_CACHE?.get(id);
}

export function getQuizTimes(q: QuizWithStatus) {
  if (q.manuallySetPhase && q.manuallySetPhase !== Phase.UNSET) return {};

  const { quizStartTs, quizEndTs, feedbackReleaseTs } = q;
  return { quizStartTs, quizEndTs, feedbackReleaseTs };
}
