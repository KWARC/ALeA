
export type PartneredUniversity = {
  code: string;
  name: string; 
  logoSrc: string; 
  name_de?: string; 
  defaultTimezone: string; 
};

export type UniversityDetailEntry = {
  fullName: string; 
  logo: string; 
  defaultTimezone: string; 
};

type UniversityBase = {
  code: string;
  shortName: string;
  fullName: string;
  logoSmall: string;
  shortName_de?: string;
  logoHeader?: string;
  defaultTimezone: string;
};

const UNIVERSITIES: UniversityBase[] = [
  {
    code: 'FAU',
    shortName: 'FAU, Erlangen-Nuremberg',
    fullName: 'Friedrich-Alexander-Universität Erlangen-Nürnberg',
    logoSmall: '/faulogo.png',
    logoHeader:
      'https://community.fau.de/wp-content/themes/community.fau-erlangen/img/FAU_Logo_Bildmarke.svg',
    defaultTimezone: 'Europe/Berlin',
  },
  {
    code: 'IISc',
    shortName: 'IISc, Bengaluru',
    fullName: 'India Institute of Science and Technology',
    logoSmall: '/iisc.png',
    defaultTimezone: 'Asia/Kolkata',
  },
  {
    code: 'Jacobs',
    shortName: 'Jacobs University, Bremen',
    fullName: 'Jacobs University',
    logoSmall: '/jacoblogo.png',
    defaultTimezone: 'Europe/Berlin',
  },
  {
    code: 'Heriot Watt',
    shortName: 'Heriot-Watt University, Edinburgh',
    fullName: 'Heriot-Watt University',
    logoSmall: '/heriott_logo.png',
    defaultTimezone: 'Europe/London',
  },
  {
    code: 'others',
    shortName: 'Other Institutions',
    fullName: 'Other Institutions',
    shortName_de: 'Andere Institutionen',
    logoSmall: '/others.png',
    defaultTimezone: 'UTC',
  },
];

export const PARTNERED_UNIVERSITIES: PartneredUniversity[] = UNIVERSITIES.map(
  ({ code, shortName, shortName_de, logoSmall, defaultTimezone }) => ({
    code,
    name: shortName,
    name_de: shortName_de,
    logoSrc: logoSmall,
    defaultTimezone,
  })
);

export const UniversityDetail: Record<string, UniversityDetailEntry> = Object.fromEntries(
  UNIVERSITIES.map(({ code, fullName, logoHeader, logoSmall, defaultTimezone }) => [
    code,
    { fullName, logo: logoHeader ?? logoSmall, defaultTimezone },
  ])
);


