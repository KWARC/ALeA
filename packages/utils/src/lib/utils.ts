import { getOuterHTML } from 'domutils';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(localizedFormat);

export const BG_COLOR = 'hsl(210, 20%, 98%)';
export const IS_SERVER = typeof window === 'undefined';
export const localStore = IS_SERVER ? undefined : localStorage;
export const Window = IS_SERVER ? undefined : window;
export const PRIMARY_COL = '#203360';
export const PRIMARY_COL_DARK_HOVER = '#162343';
export const SECONDARY_COL = '#8c9fb1';
export enum Language {
  Deutsch = 'Deutsch',
  English = 'English',
  Arabic = 'Arabic',
  Bengali = 'Bengali',
  Hindi = 'Hindi',
  French = 'French',
  Japanese = 'Japanese',
  Korean = 'Korean',
  Mandarin = 'Mandarin',
  Marathi = 'Marathi',
  Persian = 'Persian',
  Portuguese = 'Portuguese',
  Russian = 'Russian',
  Spanish = 'Spanish',
  Tamil = 'Tamil',
  Telugu = 'Telugu',
  Turkish = 'Turkish',
  Urdu = 'Urdu',
  Vietnamese = 'Vietnamese',
  Others = 'Others',
}

export const languageUrlMap: Record<string, Language> = {
  de: Language.Deutsch,
  en: Language.English,
  ar: Language.Arabic,
  bn: Language.Bengali,
  hi: Language.Hindi,
  fr: Language.French,
  ja: Language.Japanese,
  ko: Language.Korean,
  zh: Language.Mandarin,
  mr: Language.Marathi,
  fa: Language.Persian,
  pt: Language.Portuguese,
  ru: Language.Russian,
  es: Language.Spanish,
  ta: Language.Tamil,
  te: Language.Telugu,
  tr: Language.Turkish,
  ur: Language.Urdu,
  vi: Language.Vietnamese,
};

export async function waitForNSeconds(n_sec: number) {
  return new Promise((resolve) => setTimeout(resolve, n_sec * 1000));
}

export function shouldUseDrawer(windowWidth?: number) {
  if (!windowWidth) windowWidth = Window?.innerWidth;
  return windowWidth ? windowWidth < 800 : true;
}

export function extractRepoAndFilepath(sourceUrl?: string): {
  project: string | null;
  filepath: string | null;
} {
  if (!sourceUrl) return { project: null, filepath: null };
  try {
    const url = new URL(sourceUrl);
    const pathname = url.pathname;
    const parts = pathname.split('/').filter((part) => part !== ''); // Split and remove empty strings

    const dashIndex = parts.indexOf('-');

    if (dashIndex !== -1 && dashIndex > 0) {
      const projectParts = parts.slice(0, dashIndex);
      const filepathParts = parts.slice(dashIndex + 2); // Skip 'blob' and the branch/commit

      const project = projectParts.join('/');
      const filepath = filepathParts.join('/');

      return { project, filepath };
    } else {
      return { project: null, filepath: null };
    }
  } catch (error) {
    console.error(`Invalid URL [${sourceUrl}]:`, error);
    return { project: null, filepath: null };
  }
}

export function convertHtmlNodeToPlain(htmlNode?: any) {
  if (!htmlNode) return '';
  return convertHtmlStringToPlain(getOuterHTML(htmlNode));
}

export function convertHtmlStringToPlain(htmlStr: string) {
  if (IS_SERVER || !htmlStr) return htmlStr;
  // Create a new div element
  const tempDivElement = document.createElement('div');
  // Set the HTML content with the given value
  tempDivElement.innerHTML = htmlStr;
  // Retrieve the text property of the element
  return tempDivElement.textContent || tempDivElement.innerText || '';
}

export function getParamFromUri(uri: string, param: string) {
  try {
    const url = new URL(uri);
    return url.searchParams.get(param) ?? undefined;
  } catch {
    return undefined;
  }
}

export function getParamsFromUri(uri: string, params: string[]): (string | undefined)[] {
  try {
    const url = new URL(uri);
    return params.map((param) => url.searchParams.get(param) || undefined);
  } catch {
    return params.map((_) => undefined);
  }
}

// Not crypto-safe.
export function simpleNumberHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return hash;
}

// Dont use this for crypto or anything serious.
export function simpleHash(str?: string) {
  if (!str?.length) return '0';
  // return str.replace(/\W/g, ''); For debugging
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(36);
}

export function PathToTour(tourId: string) {
  const encoded = encodeURIComponent(tourId);
  return `/guided-tour/${encoded}`;
}
export function PathToTour2(tourId: string) {
  const encoded = encodeURIComponent(tourId);
  return `/guided-tour2/${encoded}`;
}

export function isFauId(id: string) {
  return id?.length === 8 && !id.includes('@');
}

export function fixDuplicateLabels<T extends { label: string }>(RAW: T[]) {
  const fixed = [...RAW]; // create a copy;
  const labelToIndex = new Map<string, number[]>();
  for (const [idx, item] of fixed.entries()) {
    if (labelToIndex.has(item.label)) {
      labelToIndex.get(item.label)?.push(idx);
    } else {
      labelToIndex.set(item.label, [idx]);
    }
  }
  for (const [label, indexes] of labelToIndex.entries()) {
    if (indexes?.length <= 1) continue;
    for (const [idx, index] of indexes.entries()) {
      fixed[index].label = `${label} (${idx + 1})`;
    }
  }
  return fixed;
}

export function getCookie(name: string) {
  if (typeof window === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length !== 2) return undefined;
  return (parts.pop() as string).split(';').shift();
}

export function isLoggedInViaCookie() {
  const cookie = getCookie('is_logged_in');
  return cookie === 'true';
}

export function setCookie(name: string, value: string) {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1); // Set expiry date to one year from now
  const expiry = `; expires=${date.toUTCString()}`;
  const path = '; path=/';
  document.cookie = `${name}=${value}${expiry}${path}`;
}

export function downloadFile(data: any, fileName: string, fileType: string) {
  // Create a blob with the data we want to download as a file
  const blob = new Blob([data], { type: fileType });
  // Create an anchor element and dispatch a click event on it
  // to trigger a download
  const a = document.createElement('a');
  a.download = fileName;
  a.href = window.URL.createObjectURL(blob);
  const clickEvt = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
  });
  a.dispatchEvent(clickEvt);
  a.remove();
}

// A "stable" random function generator. Stable because we can provide it a seed.
// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
// Stable because this always returns the same shuffle for a given array.
export function stableShuffle(array: any[]) {
  let currentIndex = array.length,
    randomIndex;

  const randomGen = mulberry32(array.length);
  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(randomGen() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

export function roundToMinutes(timestamp_ms: number) {
  const msInAMinute = 60000;
  return Math.round(timestamp_ms / msInAMinute) * msInAMinute;
}

export function truncateString(str: string, maxLength: number) {
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

export function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function chooseRandomlyFromList(list: any[]) {
  return list[Math.floor(Math.random() * list.length)];
}

export function isBusinessDomain(domain?: string) {
  if (!domain) return false;
  return ![
    'aol.com',
    'comcast.net',
    'free.fr',
    'gmail.com',
    'gmx.de',
    'gmx.com',
    'gmx.us',
    'googlemail.com',
    'hotmail.co.uk',
    'hotmail.com',
    'hotmail.fr',
    'icloud.com',
    'libero.it',
    'live.com',
    'msn.com',
    'mac.com',
    'me.com',
    'orange.fr',
    'outlook.com',
    'rediffmail.com',
    'rocketmail.com',
    'protonmail.com',
    'wanadoo.fr',
    'web.de',
    'yahoo.co.in',
    'yahoo.co.uk',
    'yahoo.com',
    'yahoo.com.br',
    'yahoo.fr',
    'yandex.ru',
    'ymail.com',
    'yopmail.com',
  ].includes(domain);
}
export function getDomainFromEmail(email: string): string | undefined {
  if (!email) return undefined;
  const parts = email.split("@");
  return parts.length === 2 ? parts[1] : undefined;
}
export function truncateText(text: string, maxLength: number) {
  if (text.length > maxLength) {
    text = text.substring(0, maxLength) + '...';
  }
  return text;
}
export const formatTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secondsLeft = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours} hr ${minutes} min ${secondsLeft} sec`;
  } else {
    return `${minutes} min ${secondsLeft} sec`;
  }
};

export function dateToEpochMs(dateStr: string) {
  return dayjs(dateStr).endOf('day').valueOf();
}

export function epochMsToDateInput(epochMs?: number) {
  return epochMs ? dayjs(epochMs).format('YYYY-MM-DD') : '';
}

export function epochMsToCivilDate(epochMs?: number) {
  return epochMs ? dayjs(epochMs).format('LL') : '';
}

export function pathToCourseResource(
  institutionId: string,
  courseId: string,
  instance: string,
  resourceName: string
): string {
  return `/${institutionId}/${courseId}/${instance}${resourceName.startsWith('/') ? resourceName : `/${resourceName}`}`;
}


export function pathToStudyBuddy(
  institutionId: string,
  courseId: string,
  instance: string = 'latest'
): string {
  return pathToCourseResource(institutionId, courseId, instance, '/study-buddy');
}


export function pathToHomework(
  institutionId: string,
  courseId: string,
  instance: string = 'latest'
): string {
  return pathToCourseResource(institutionId, courseId, instance, '/homework');
}


export function pathToPracticeProblems(
  institutionId: string,
  courseId: string,
  instance: string = 'latest'
): string {
  return pathToCourseResource(institutionId, courseId, instance, '/practice-problems');
}


export function pathToInstructorDash(
  institutionId: string,
  courseId: string,
  instance: string = 'latest'
): string {
  return pathToCourseResource(institutionId, courseId, instance, '/instructor-dash');
}
