import { Window } from '@alea/utils';
import { NextRouter } from 'next/router';
import { de } from './de';
import { en } from './en';

export function getLocaleObject(router?: NextRouter) {
  const locale = router?.locale ?? (Window as any)?.LANGUAGE;
  return locale === 'de' ? de : en;
}
