export interface CourseInfo {
  courseId: string;
  courseName: string;
  notes: string;
  landing: string;
  notesLink: string;
  imageLink: string;
  courseHome: string;
  cardsLink: string;
  slidesLink: string;
  forumLink: string;
  quizzesLink: string;
  isCurrent: boolean;
  hasQuiz: boolean;
  hasHomework: boolean;
  universityId?: string;
  instances?: { semester: string; instructors?: string[] | null }[];
  instructors?: string[] | null;
  teaser?: string | null;
  slides?: string;
}

// CHANGED: Updated to support new URL structure with institutionId and instanceId
// Falls back to old structure if institutionId/instanceId not provided (backward compatibility)
export function getSlidesLink(courseId: string, institutionId?: string, instanceId?: string) {
  if (institutionId && instanceId) {
    return `/${institutionId}/${courseId}/${instanceId}/course-view`;
  }
  return `/course-view/${courseId}`;
}

export function getForumLink(courseId: string, institutionId?: string, instanceId?: string) {
  if (institutionId && instanceId) {
    return `/${institutionId}/${courseId}/${instanceId}/forum`;
  }
  return `/forum/${courseId}`;
}

export function getCardsLink(courseId: string) {
  return `/flash-cards/${courseId}`;
}

export function getCourseHome(courseId: string, institutionId?: string, instanceId?: string) {
  if (institutionId && instanceId) {
    return `/${institutionId}/${courseId}/${instanceId}`;
  }
  return `/course-home/${courseId}`;
}

export function getNotesLink(courseId: string, institutionId?: string, instanceId?: string) {
  if (institutionId && instanceId) {
    return `/${institutionId}/${courseId}/${instanceId}/course-notes`;
  }
  return `/course-notes/${courseId}`;
}

export function getQuizzesLink(courseId: string, institutionId?: string, instanceId?: string) {
  if (institutionId && instanceId) {
    return `/${institutionId}/${courseId}/${instanceId}/quiz-dash`;
  }
  return `/quiz-dash/${courseId}`;
}

// NEW: Helper functions for new URL structure
export function getHomeworkLink(courseId: string, institutionId?: string, instanceId?: string) {
  if (institutionId && instanceId) {
    return `/${institutionId}/${courseId}/${instanceId}/homework`;
  }
  return `/homework/${courseId}`;
}

export function getStudyBuddyLink(courseId: string, institutionId?: string, instanceId?: string) {
  if (institutionId && instanceId) {
    return `/${institutionId}/${courseId}/${instanceId}/study-buddy`;
  }
  return `/study-buddy/${courseId}`;
}

export function getPracticeProblemsLink(courseId: string, institutionId?: string, instanceId?: string) {
  if (institutionId && instanceId) {
    return `/${institutionId}/${courseId}/${instanceId}/practice-problems`;
  }
  return `/practice-problems/${courseId}`;
}

export function getInstructorDashLink(courseId: string, institutionId?: string, instanceId?: string, tab?: string) {
  if (institutionId && instanceId) {
    const tabParam = tab ? `?tab=${tab}` : '';
    return `/${institutionId}/${courseId}/${instanceId}/instructor-dash${tabParam}`;
  }
  const tabParam = tab ? `?tab=${tab}` : '';
  return `/instructor-dash/${courseId}${tabParam}`;
}
export function getCoursePdfUrl(notesUri: string): string {
  try {
    const url = new URL(notesUri);
    url.pathname = '/doc';
    url.searchParams.set('format', 'pdf');
    return url.toString();
  } catch (e) {
    return notesUri.replace('mathhub.info', 'mathhub.info/doc') + '&format=pdf';
  }
}

export const CURRENT_TERM = 'WS25-26';

// CHANGED: Added optional institutionId and instanceId parameters for new URL structure
export function createCourseInfo(
  courseId: string,
  courseName: string,
  notes: string,
  landing: string,
  isCurrent = false,
  hasQuiz = false,
  hasHomework = false,
  universityId?: string,
  instances?: { semester: string; instructors?: string[] | null }[],
  instructors?: string[] | null,
  teaser?: string | null,
  slides?: string,
  institutionId?: string,
  instanceId?: string
): CourseInfo {
  return {
    courseId,
    courseName,
    imageLink: `/${courseId}.jpg`,
    notes,
    courseHome: getCourseHome(courseId, institutionId, instanceId),
    notesLink: getNotesLink(courseId, institutionId, instanceId),
    cardsLink: getCardsLink(courseId),
    slidesLink: getSlidesLink(courseId, institutionId, instanceId),
    forumLink: getForumLink(courseId, institutionId, instanceId),
    quizzesLink: getQuizzesLink(courseId, institutionId, instanceId),
    landing,
    isCurrent,
    hasQuiz,
    hasHomework,
    universityId,
    instances,
    instructors,
    teaser,
    slides,
  };
}

export interface LectureEntry {
  timestamp_ms: number;
  sectionUri?: string;
  clipId?: string; // https://fau.tv/clip/id/{clipId}
  targetSectionUri?: string;
  isQuizScheduled?: boolean;
  slideUri?: string;
  slideNumber?: number; // Don't use this anywhere , use slideUri instead
  sectionCompleted?: boolean;
  autoDetected?: {
    clipId?: string;
    sectionUri?: string;
    slideUri?: string;
    sectionCompleted?: boolean;
  };
  lectureEndTimestamp_ms?: number;
  venue?: string;
  venueLink?: string;
}

export interface CoverageTimeline {
  [courseId: string]: LectureEntry[];
}

export const COURSES_INFO: { [courseId: string]: CourseInfo } = {
  'ai-1': createCourseInfo(
    'ai-1',
    'Artificial Intelligence I',
    'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=notes1&l=en',
    'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=coursepage1&l=en',
    true,
    true,
    true,
    'FAU',
    [{ semester: 'WS25-26', instructors: null }],
    ['Michael Kohlhase'],
    'A classical course on symbolic artificial intelligence covering the whole range of methods from search-based problem solving, via constraint propagation and logical/formal methods to planning.',
    'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=slides1&l=en'
  ),
  'ai-2': createCourseInfo(
    'ai-2',
    'Artificial Intelligence II',
    'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=notes2&l=en',
    'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=coursepage2&l=en',
    false,
    true,
    true,
    'FAU',
    [{ semester: 'SS25', instructors: null }],
    ['Michael Kohlhase'],
    'A classical course on statistical and subsymbolic artificial intelligence covering the whole range of methods from reasoning with uncertainty, decision theory, MDPs and POMDPs to machine learning and natural language processing.',
    'https://mathhub.info?a=courses/FAU/AI/course&p=course/notes&d=slides2&l=en'
  ),
  gdp: createCourseInfo(
    'gdp',
    'Grundlagen der Programmierung',
    'https://stexmmt.mathhub.info/:sTeX?a=courses/FAU/GDP/course&p=course/notes&d=notes&l=en',
    'https://stexmmt.mathhub.info/:sTeX?a=courses/FAU/GDP/course&p=course/notes&d=coursepage&l=en',
    false,
    true,
    true,
    'FAU',
    [
      { semester: 'WS23-24', instructors: null },
      { semester: 'WS24-25', instructors: null },
    ],
    ['Vanessa Klein'],
    null,
    'https://stexmmt.mathhub.info/:sTeX?a=courses/FAU/GDP/course&p=course/notes&d=slides&l=en'
  ),
  'iwgs-1': createCourseInfo(
    'iwgs-1',
    'Informatische Werkzeuge für die Geistes- und Sozialwissenschaften I',
    'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=notes-part1&l=en',
    'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=coursepage1&l=en',
    true,
    true,
    true,
    'FAU',
    [{ semester: 'WS25-26', instructors: null }],
    ['Michael Kohlhase'],
    'This course introduces computational tools for the humanities and social studies: it covers basic programming in phython, introduces the content types of strings, documents, and how to compute with them. This is then used to introduce basic web applications (HTML, CSS, HTTP, server side scripting and JQuery in theory an practice.',
    'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=slides-part1&l=en'
  ),
  'iwgs-2': createCourseInfo(
    'iwgs-2',
    'Informatische Werkzeuge für die Geistes- und Sozialwissenschaften II',
    'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=notes-part2&l=en',
    'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=coursepage2&l=en',
    false,
    true,
    true,
    'FAU',
    [{ semester: 'SS25', instructors: null }],
    ['Michael Kohlhase'],
    'This course continues the introduction of computational tools for the humanities and social studies (HSS) from IWGS-1: It covers databases as the persistence-layer of web applications, XML and JSON as interchange formats, image formats and processing, then then introduces linked open data as a FAIR research data format for object-centered data, culminating in an in-depth look at the WissKI system that uses them for HSS data collection, curation, and querying.',
    'https://mathhub.info?a=courses/FAU/IWGS/course&p=course/notes&d=slides-part2&l=en'
  ),
  krmt: createCourseInfo(
    'krmt',
    'Knowledge Representation of Mathematical Theories',
    'https://mathhub.info?a=courses/FAU/KRMT/course&p=dennis/course&d=notes&l=en',
    'https://mathhub.info?a=courses/FAU/KRMT/course&p=dennis/course&d=coursepage&l=en',
    false,
    true,
    true,
    'FAU',
    [{ semester: 'SS25', instructors: ['Dennis Müller'] }],
    ['Michael Kohlhase'],
    '<p>This repository contains the sources for the notes of the course <em>Logik-Basierte Wissensrepräsentation für Mathematisch/Technisches Wissen </em> at FAU Erlangen-Nürnberg.</p>',
    'https://mathhub.info?a=courses/FAU/KRMT/course&p=dennis/course&d=slides&l=en'
  ),
  lbs: createCourseInfo(
    'lbs',
    'Logic-Based Natural Language Semantics',
    'https://mathhub.info?a=courses/FAU/LBS/course&p=course/notes&d=notes&l=en',
    'https://mathhub.info?a=courses/FAU/LBS/course&p=course/notes&d=coursepage&l=en',
    true,
    true,
    true,
    'FAU',
    [{ semester: 'WS25-26', instructors: null }],
    ['Michael Kohlhase'],
    "This course covers the construction of logic-based models for natural language sentences and discourses. If starts with an introduction of Montague's method of fragments, and then covers selected phenomena like discourse logics, propositional attitudes and modalities.",
    'https://mathhub.info?a=courses/FAU/LBS/course&p=course/notes&d=slides&l=en'
  ),
  smai: createCourseInfo(
    'smai',
    'Symbolic Methods for Artificial Intelligence',
    'https://mathhub.info?a=courses/FAU/SMAI/course&p=course/notes&d=notes&l=en',
    'https://mathhub.info?a=courses/FAU/SMAI/course&p=course/notes&d=coursepage&l=en',
    true,
    true,
    true,
    'FAU',
    [
      { semester: 'SS25', instructors: null },
      { semester: 'WS25-26', instructors: null },
    ],
    ['Michael Kohlhase'],
    'This course introduces the scientific methods used in symbolic AI. It is geared towards closing the gap many student experience between their engineering-oriented undergradudate education and the abstract, mathematical methods needed for symbolic AI.',
    'https://mathhub.info?a=courses/FAU/SMAI/course&p=course/notes&d=slides&l=en'
  ),
  acs: createCourseInfo(
    'acs',
    'Advanced Computer Science (Fragment)',
    'https://stexmmt.mathhub.info/:sTeX?a=courses/Jacobs/ACS/course&p=course/notes&d=notes&l=en',
    'https://stexmmt.mathhub.info/:sTeX?a=courses/Jacobs/ACS/course&p=course/notes&d=coursepage&l=en',
    false,
    true,
    false,
    'Jacobs',
    [{ semester: 'Fall 2006', instructors: null }],
    ['Michael Kohlhase'],
    null,
    'https://stexmmt.mathhub.info/:sTeX?a=courses/Jacobs/ACS/course&p=course/notes&d=slides&l=en'
  ),
  comsem: createCourseInfo(
    'comsem',
    'Computational Semantics of Natural Language',
    'https://mathhub.info?a=courses/Jacobs/ComSem&p=course/notes&d=notes&l=en',
    'https://mathhub.info?a=courses/Jacobs/ComSem&p=course/notes&d=coursepage&l=en',
    false,
    true,
    false,
    'Jacobs',
    [],
    ['Michael Kohlhase'],
    ' <p>This repository contains the sources for the notes of the course <em>Computational Semantics of Natural Language</em> at Jacobs University Bremen. The course covers the semantics construction and semantic analysis processes in the "Method of Fragments", progressing from simple fragments expressible in first-order logics to Montagovian Semantics.</p>',
    'https://mathhub.info?a=courses/Jacobs/ComSem&p=course/notes&d=slides&l=en'
  ),
  complog: createCourseInfo(
    'complog',
    'Computational Logic',
    'https://mathhub.info?a=courses/Jacobs/CompLog&p=course/notes&d=notes&l=en',
    'https://mathhub.info?a=courses/Jacobs/CompLog&p=course/notes&d=coursepage&l=en',
    false,
    true,
    false,
    'Jacobs',
    [],
    ['Michael Kohlhase'],
    '<p>This repository contains the sources for the notes of the course <em>Computational Logic</em> at Jacobs University Bremen. The course covers the syntax, semantics, and calculi of first-order, higher-order, modal, dynamic, and description logics with a particular focus on the computational properties.</p>',
    'https://mathhub.info?a=courses/Jacobs/CompLog&p=course/notes&d=slides&l=en'
  ),
  'gencs i': createCourseInfo(
    'gencs i',
    'General Computer Science I',
    'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=notes1&l=en',
    'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=coursepage1&l=en',
    false,
    true,
    false,
    'Jacobs',
    [],
    ['Michael Kohlhase'],
    '<p>This repository contains the sources for the notes of the course <em>General Computer Science</em> at Jacobs University Bremen. The course covers conceptual aspects of many of the foundational topics of Computer Science from the ground up.</p>',
    'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=slides1&l=en'
  ),
  'gencs ii': createCourseInfo(
    'gencs ii',
    'General Computer Science II',
    'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=notes2&l=en',
    'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=coursepage2&l=en',
    false,
    true,
    false,
    'Jacobs',
    [],
    ['Michael Kohlhase'],
    '<p>This repository contains the sources for the notes of the course <em>General Computer Science</em> at Jacobs University Bremen. The course covers conceptual aspects of many of the foundational topics of Computer Science from the ground up.</p>',
    'https://mathhub.info?a=courses/Jacobs/GenCS/course&p=course/notes&d=slides2&l=en'
  ),
  genict: createCourseInfo(
    'genict',
    'General Information and Communication Technology',
    'https://mathhub.info?a=courses/Jacobs/GenICT/course&p=course/notes&d=notes&l=en',
    'https://mathhub.info?a=courses/Jacobs/GenICT/course&p=course/notes&d=coursepage&l=en',
    false,
    true,
    false,
    'Jacobs',
    [
      { semester: 'Fall 2014', instructors: null },
      { semester: 'Fall 2015', instructors: null },
      { semester: 'Spring 2015', instructors: null },
    ],
    ['Michael Kohlhase'],
    null,
    'https://mathhub.info?a=courses/Jacobs/GenICT/course&p=course/notes&d=slides&l=en'
  ),
  tdm: createCourseInfo(
    'tdm',
    'Text and Digital Media ',
    'https://mathhub.info?a=courses/Jacobs/TDM/course&p=course/notes&d=notes&l=en',
    'https://mathhub.info?a=courses/Jacobs/TDM/course&p=course/notes&d=coursepage&l=en',
    false,
    true,
    false,
    'Jacobs',
    [],
    ['Michael Kohlhase'],
    '<p>This repository contains the sources for the notes of the transdisciplinary course <em>Text and Digital Media</em> at Jacobs University Bremen.</p>',
    'https://mathhub.info?a=courses/Jacobs/TDM/course&p=course/notes&d=slides&l=en'
  ),
};

export const MaAI_COURSES: {
  [courseId: string]: {
    courseName: string;
  };
} = {
  advdl: {
    courseName: 'Advanced Deep Learning',
  },
  adap: {
    courseName: 'Advanced Design and Programming',
  },
  americo: {
    courseName: 'Advanced Mechanized Reasoning in Coq',
  },
  advpt: {
    courseName: 'Advanced Programming Techniques',
  },
  atdl: {
    courseName: 'Advanced Topics in Deep Learning',
  },
  algprog: {
    courseName: 'Algebra of Programming',
  },
  aloa: {
    courseName: 'Algebraic and Logical Aspects of Automata Theory',
  },
  // algbioinf: {
  //   courseName: 'Algorithmic Bioinformatics',
  // },
  approxc: {
    courseName: 'Approximate Computing',
  },
  'ai-1': {
    courseName: 'Artificial Intelligence I',
  },
  'ai-2': {
    courseName: 'Artificial Intelligence II',
  },
  // aml: {
  //   courseName: 'Artificial Motor Learning',
  // },
  biosig: {
    courseName: 'Biomedical Signal Analysis',
  },
  cnaid: {
    courseName: 'Cognitive Neuroscience for AI Developers',
  },
  // compmri: {
  //   courseName: 'Computational Magnetic Resonance Imaging',
  // },
  // compneurotech: {
  //   courseName: 'Computational Neurotechnology / Numerische Neurotechnologie',
  // },
  cpac: {
    courseName: 'Computational Photography and Capture',
  },
  compvp: {
    courseName: 'Computational Visual Perception',
  },
  // ra: {
  //   courseName: 'Computer Architecture',
  // },
  cv: {
    courseName: 'Computer Vision',
  },
  // connmob: {
  //   courseName: 'Connected Mobility and Autonomous Driving',
  // },
  dl: {
    courseName: 'Deep Learning',
  },
  dlfo: {
    courseName: 'Description Logic and Formal Ontologies',
  },
  // es: {
  //   courseName: 'Eingebettete Systeme',
  // },
  fv: {
    courseName: 'Formal Verification',
  },
  hci: {
    courseName: 'Human Computer Interaction',
  },
  hrc: {
    courseName: 'Human-Robot Co-Adaptation',
  },
  // isf: {
  //   courseName: 'Inertial Sensor Fusion',
  // },
  infovis: {
    courseName: 'Informationsvisualisierung',
  },
  // idf: {
  //   courseName: 'Intent Detection and Feedback',
  // },
  // 'impip/mipia': {
  //   courseName: 'Interventional Medical Image Processing',
  // },
  // ident: {
  //   courseName: 'Introduction to Dependently Typed Programming',
  // },
  // xml: {
  //   courseName: 'Introduction to Explainable Machine Learning',
  // },
  krmath: {
    courseName: 'Knowledge Representation for Mathematical Theories',
  },
  kommpar: {
    courseName: 'Kommunikation und parallele Prozesse',
  },
  krmt: {
    courseName: 'Logic-Based Representation of Mathematical/Technical Knowledge',
  },
  lbs: {
    courseName: 'Logik-Basierte Sprachverarbeitung',
  },
  mlts: {
    courseName: 'Machine Learning for Time Series Deluxe',
  },
  mlts_basic: {
    courseName: 'Machine Learning for Time Series',
  },
  // 'dmip/mipda': {
  //   courseName: 'Medical Image Processing for Diagnostic Applications ',
  // },
  made: {
    courseName: 'Methods of Advanced Data Engineering',
  },
  // mw: {
  //   courseName: 'Middleware - Cloud Computing',
  // },
  ml: {
    courseName: 'Modallogik',
  },
  // mbprog: {
  //   courseName: 'Monad-based Programming',
  // },
  mmsec: {
    courseName: 'Multimedia Security',
  },
  mpa: {
    courseName: 'Music Processing Analysis',
  },
  nocl: {
    courseName: 'Nonclassical Logics in Computer Science',
  },
  // psys: {
  //   courseName: 'Parallele Systeme',
  // },
  pa: {
    courseName: 'Pattern Analysis',
  },
  pr: {
    courseName: 'Pattern Recognition',
  },
  semprog: {
    courseName: 'Practical Semantics of Programming Languages',
  },
  rl: {
    courseName: 'Reinforcement Learning',
  },
  slp: {
    courseName: 'Speech and Language Processing',
  },
  slu: {
    courseName: 'Speech and Language Understanding',
  },
  si: {
    courseName: 'Swarm Intelligence',
  },
  smai: {
    courseName: 'Symbolic Methods for Artificial Intelligence',
  },
  vds: {
    courseName: 'Verifikation digitaler Systeme',
  },
  vs: {
    courseName: 'Verteilte Systeme',
  },
  'vcmed1+2': {
    courseName: 'Visual Computing in Medicine VCMed1+2',
  },
  wuv: {
    courseName: 'Wissensrepräsentation und -verarbeitung',
  },
  ai1sysproj: {
    courseName: 'AI 1 Systems Project',
  },
  ai2sysproj: {
    courseName: 'AI 2 Systems Project',
  },
  aicomvp: {
    courseName: 'AI Project: Computational Visual Perception',
  },
  bimap: {
    courseName: 'Biomedical Image Analysis Project',
  },
  compimagproj: {
    courseName: 'Computational Imaging Project',
  },
  // radl: {
  //   courseName: 'Computer Architechtures for Deep Learning Applications',
  // },
  digalchemy: {
    courseName: 'Digital alchemy',
  },
  fabproj: {
    courseName: 'Fabrication Project',
  },
  handsonrar: {
    courseName: 'Hands on Rehabilitation and Assistive Robotics',
  },
  idealab: {
    courseName: 'Image and Data Analysis: Engage in your own research project at the IDEA lab',
  },
  innolabpro: {
    courseName: 'Innovationslabor für Wearable und Ubiquitous Computing',
  },
  // prism: {
  //   courseName: 'Intelligent Sensorimotor Systems Lab PRISM',
  // },
  intvisproj: {
    courseName: 'Interactive Visualization Project',
  },
  // 'llr+': {
  //   courseName: 'Legged Locomotion of Robots Deluxe',
  // },
  mastproj: {
    courseName: 'Master Projekt Datenmanagement',
  },
  neurotechproj: {
    courseName: 'Neurotechnology Project',
  },
  bionets: {
    courseName: 'Project Biomedical Network Science BIONETS',
  },
  projcv: {
    courseName: 'Project Computer Vision',
  },
  digirealpr: {
    courseName: 'Project Digital Reality DigiRealPR',
  },
  // iiml: {
  //   courseName: 'Project Intraoperative Imaging and Machine Learning IIML',
  // },
  projmkr: {
    courseName: 'Project Mathematical Knowledge Representation',
  },
  projmap: {
    courseName: 'Project Music and Audio Processing ProjMAP',
  },
  'ai-faps': {
    courseName: 'Project on Applied AI in Factory Automation and Production Systems',
  },
  prl: {
    courseName: 'Project Representation Learning PRL',
  },
  projsnlp: {
    courseName: 'Project Symbolic Natural Language Processing',
  },
  'oss-proj': {
    courseName: 'Projekt Applied Software Engineering OSS-PROJ',
  },
  pki: {
    courseName: 'Projekt Künstliche Intelligenz ',
  },
  projmad: {
    courseName: 'Projekt Machine Learning and Data Analytics PROJMAD',
  },
  projme: {
    courseName: 'Projekt Pattern Recognition ProjME',
  },
  rarlab: {
    courseName: 'Rehabilitation and Assistive Robotics Research Lab RARLab',
  },
  grapro: {
    courseName: 'Selected Projects in Computer Graphics GraPro',
  },
  surgrob: {
    courseName: 'Surgical Robotics SurgRob',
  },
  'oss-amos-sd': {
    courseName: 'The AMOS Project: Agile Methods and Open Source OSS-AMOS-SD',
  },
  advst: {
    courseName: 'Advanced Simulation Technology',
  },
  aneurolab: {
    courseName: 'Applied Neural Engineering',
  },
  bdsem: {
    courseName: 'Big Data Seminar',
  },
  blender: {
    courseName: 'Blender Seminar',
  },
  ets: {
    courseName: 'Catching your eyes: AI-driven modeling and analysis of eye-tracking data',
  },
  semcogsurob: {
    courseName: 'Cognitive Surgical Robotics',
  },
  dipsylab: {
    courseName: 'Digital Psychology Lab',
  },
  // semdpdl: {
  //   courseName: 'Digital Pathology and Deep Learning',
  // },
  advmlad: {
    courseName: 'Erweitertes maschinelles Lernen für Anomalieerkennung',
  },
  eaisem: {
    courseName: 'Ethics in AI',
  },
  fantdat: {
    courseName: 'Fantastic datasets and where to find them',
  },
  greenai: {
    courseName: 'Green AI: AI for sustainability and sustainability of AI',
  },
  semhitl: {
    courseName: 'Humans in the Loop: The Design of Interactive AI Systems',
  },
  llr: {
    courseName: 'Legged locomotion of Robots',
  },
  mlinmri: {
    courseName: 'Machine Learning in MRI',
  },
  nyt: {
    courseName: 'Nailing your Thesis (Anleitung zum wissenschaftlichen Arbeiten)',
  },
  semaineuro: {
    courseName: 'Neurosciene-inspired Artificial Intelligence',
  },
  eaisem2: {
    courseName: 'Philosophy of AI',
  },
  // semadvdl: {
  //   courseName: 'Seminar Advanced Deep Learning',
  // },
  autoinf: {
    courseName: 'Seminar Automata over Infinite Words',
  },
  colog: {
    courseName: 'Seminar Co-algebraic Logic',
  },
  semcv: {
    courseName: 'Seminar Computer Vision',
  },
  semdl: {
    courseName: 'Seminar Deep Learning',
  },
  semethdig: {
    courseName: 'Seminar Ethik der Digitalisierung',
  },
  grahs: {
    courseName: 'Seminar Graphical Data Processing',
  },
  invhs: {
    courseName: 'Seminar Inverse Rendering',
  },
  // madi40: {
  //   courseName: 'Seminar Machine Learning and Data Analytics for Industry 4.0',
  // },
  map: {
    courseName: 'Seminar Multi-Core Architectures and Programming',
  },
  netmed: {
    courseName: 'Seminar Network Medicine',
  },
  semnom: {
    courseName: 'Seminar Nominal Quantities and Automation',
  },
  // neura: {
  //   courseName: 'Seminar Novel Computer Architechtures',
  // },
  semsurgrobhardw: {
    courseName: 'Seminar Surgical Robotics Hardware',
  },
  semsurgrobsoftw: {
    courseName: 'Seminar Surgical Robotics Software',
  },
  // thinfsem: {
  //   courseName: 'Seminar Theoretische Informatik',
  // },
  vchs: {
    courseName: 'Seminar Visual Computing',
  },
  semwuv: {
    courseName: 'Seminar Wissenrepräsentation und verarbeitung',
  },
  surgrob_sem: {
    courseName: 'Surgical Robotics',
  },
  topcat: {
    courseName: 'Topics of Category Theory',
  },
  traco: {
    courseName: 'Tracking Olympiad',
  },

  // From Claudia Barnickel
  'sisy-2': { courseName: 'Signale und Systeme II' },
  pb: { courseName: 'Passive Bauelemente und deren HF-Verhalten' },
  st: { courseName: 'Schaltungstechnik' },
  'rt-a': { courseName: 'Regelungstechnik A' },
  'mt-1-biomat': { courseName: 'Medizintechnik I' },
  subio: { courseName: 'Surfaces of Biomaterials' },
  'rob-1': { courseName: 'Robotics 1' },
  'rob-2': { courseName: 'Robotics 2' },
  mcs: { courseName: 'Mechatronic Components and Systems' },
  rmi: { courseName: 'Robot Mechanisms and User Interfaces' },
  rof: { courseName: 'Robotics Frameworks' },
  cdr: { courseName: 'Computational Multibody Dynamics' },
  hmr: { courseName: 'Human-centered Mechatronics and Robotics' },
  rar: { courseName: 'Rehabilitation and Assistive Robotics' },
  aimedrob: { courseName: 'AI in Medical Robotics' },
  ins: { courseName: 'Interfacing the Neuromuscular System' },
  rsd: { courseName: 'Robotics in Surgery and Diagnostics' },
  ulp: { courseName: 'Upper-Limb Prosthetics' },
  bac: { courseName: 'Body Area Communications' },
  gni: { courseName: 'Geometric Numerical Integration' },
  pih: { courseName: 'Photonics in Medical Technology' },
  neurotech: { courseName: 'Computational Neurotechnology' },
  // from Felix Schmutterer
  'siwir-2': { courseName: 'Simulation und Wissenschaftliches Rechnen 2' },
  hesp: { courseName: 'High End Simulation in Practice' },
  hetron: { courseName: 'Heterogene Rechnerarchitekturen Online' },
  funcan: { courseName: 'Functional Analysis for Engineers' },
  opting: { courseName: 'Optimierung für Ingenieure mit Praktikum' },
  elnuma: { courseName: 'Elementary Numerical Mathematics' },
  anla: { courseName: 'Algorithms of Numerical Linear Algebra' },
  lkopt: { courseName: 'Optimization in industry and economy' },
  ano: { courseName: 'Advanced nonlinear optimization' },
  'discopt-1': { courseName: 'Discrete optimization I' },
  'discopt-2': { courseName: 'Discrete optimization II' },

  // from Claudia Barnickel (bachelor's program)
  'medtech-1': { courseName: 'Medizintechnik I (Biomaterialien)' },
  'medtech-2': { courseName: 'Medizintechnik II (Bildgebende Verfahren)' },
  'matha-1': { courseName: 'Mathematik A 1' },
  'matha-2': { courseName: 'Mathematik A 2' },
  'matha-3': { courseName: 'Mathematik A 3' },
  'matha-4': { courseName: 'Mathematik A 4' },
  'gde-1': { courseName: 'Grundlagen der Elektrotechnik I für MT, MECH' },
  'gde-2': { courseName: 'Grundlagen der Elektrotechnik II' },
  'exphy-1': { courseName: 'Experimentalphysik II' },
  'exphy-2': { courseName: 'Experimentalphysik I' },
  stfl: { courseName: 'Statik und Festigkeitslehre' },
  'aud-mt': { courseName: 'Algorithmen und Datenstrukturen für MT' },
  'alg-ks': { courseName: 'Algorithmik kontinuierlicher Systeme' },
  'minors-ai': {
    courseName: "Minors in AI Master's program",
  },
  'biomed-eng': {
    courseName: 'Biomedical Engineering',
  },
  'bus-econ': {
    courseName: 'Business Economics',
  },
  'comp-graphics': {
    courseName: 'Computer Graphics',
  },
  'high-perf-comp': {
    courseName: 'High Performance Computing',
  },
  'math-data-sci': {
    courseName: 'Mathematical Data Science',
  },
  'robotics-auto': {
    courseName: 'Robotics & Automation',
  },
};
