import CourseMetadata from '../components/instructor-panel/CourseMetadata';

export const en = {
  home: {
    header: 'ALeA based Courses at FAU',
    courseSection: 'Current semester',
    otherCourses: 'Other Courses',
    guidedTourHeader: 'Topic-Based, Free Style Learning',
    footerInfo:
      "Active course materials incorporate learning support services based on a model that is updated with every interaction with the materials. Such models of a user's preferences and competencies contain highly sensitive personal data. Therefore the learning support services (and corresponding user model data collection) are only enabled when the user is logged-in and are kept secure and under exclusive control of the respective user in the Voll-KI Trust Zone.",
    expIconHover1: "See what's brewing in our laboratory.",
    expIconHover2: 'Exercise Extreme Caution!',
    studyBuddyTooltip:
      'Click here to easily connect with fellow students who share your learning goals',
    cardIntro:
      '"Flash Cards" support reviewing and drilling the concepts of the' +
      ' course. Learners are shown cards with concept names that can be' +
      ' flipped to view the definition. Learners self-assess their concept' +
      ' mastery, which helps us update the cards shown in drills.',
    courseThumb: {
      notes: 'Notes',
      cards: 'Cards',
      slides: 'Slides',
      forum: 'Forum',
      quizzes: 'Quizzes',
      homeworks: 'Homeworks',
      studyBuddy: 'Study Buddy',
      practiceProblems: 'Practice Problems',
      instructorDashBoard: 'Instructor Dashboard',
    },
    newHome: {
      alea: 'ALᴇA: Adaptive Learning Assistant',
      aleaDesc:
        "Courses that adapt to user's preferences and competencies focused on the knowledge conveyed in a particular knowledge unit.",
      signUpNow: 'Sign up now',
      exploreOurCourse: 'Explore our Courses',
      publications: 'Publications',
      whyAlea: 'Why ALᴇA?',
      exploreCourses: 'Explore Courses',
      partneredWith:
        'Top-tier educational content + developed at + esteemed institutions worldwide',
      vollKiProjectInfo:
        'The VoLL-KI Project is funded by the Federal Ministry of Research, Technology and Space (BMFTR) under the grant 16DHBKI089 with almost 5 Million Euro and runs Dec. 2021 to November 2025.',
    },
  },
  login: {
    alreadyLoggedIn: 'You are already logged in.',
    logout: 'Logout',
    fauLogin: 'Log in with FAU IdM',
    loginWithEmail: 'Log in with EMAIL',
    fakeLogin: 'Fake User Login',
    warning: 'Warning',
    logoutWarning: 'Logging out from FAU IdM-Portal will NOT log you out here.',
    notesHeader:
      'Active course materials incorporate learning support services based ' +
      'on a model that is updated with every interaction with the materials. ' +
      "Such models of a user's preferences and competencies contain highly " +
      '**sensitive personal data**. Therefore the learning support services (and ' +
      'corresponding user model data collection) are only enabled when the ' +
      'user is logged-in and are kept secure and under exclusive control of ' +
      'the respective user in the **Voll-KI Trust Zone**. Please ' +
      'note the following consequences:',
    notesPoint1:
      '**Disclaimer :** ALᴇA is not a production-ready system, so system ' +
      'functionality may change or go away without prior notice. ' +
      'You are participating in this experimental system ' +
      'voluntarily, we hope that the system will enhance your ' +
      'learning experience and success. But there will not be any ' +
      'renumeration and/or difference to the way you are graded or ' +
      'evaluated in the course.',
    notesPoint2:
      '**Data Collection :** The system will collect personalized data on all of your ' +
      'interactions with the system, including ' +
      'click/hover/mouse-movement-streams, page requests, results ' +
      'of quizzes, etc. The system uses this data to generate ' +
      'learning competency models that in turn affect the generated ' +
      'course materials and the interaction with the system.',
    notesPoint3:
      '**Data Privacy :** Note that personalized data will only be accessible to ' +
      'agents that are authenticated with your personal IDM ' +
      'credentials. In particular, no personal data will be ' +
      'transmitted outside the system without your consent.',
    notesPoint4:
      '**Data Use :** The VoLL-KI research project will use this data in ' +
      'aggregated, anonymised, and/or pseudonymized form to ' +
      'evaluate of the system and the underlying methods. We will ' +
      'use best professional effort to make sure that personalized ' +
      'data cannot be re-engineered from aggregated data. Details ' +
      'about the KI System can be found here' +
      ' : [Link](https://gitos.rrze.fau.de/voll-ki/fau/SSFC/-/wikis/home)',
    guest: {
      encourage:
        'While the VoLL-KI SSFC system is initially intended for FAU students, we ' +
        'are working on expanding our offerings to more learners. Meanwhile, we ' +
        'encourage you to login as a guest and test drive the system.',
      entryButton: 'Guest User Login',
      chooseLearnerHelperText:
        "The platform content is tailored to the learner's competencies. Please choose an initial persona above to get started.",
      personaSelect: 'Choose Persona',
      guestIdText: 'Guest Id',
      guestNameText: 'Guest Username',
      loginButton: 'Login as a guest',
    },
  },
  flashCards: {
    header: 'Configure your flash card stack for drilling/revising!',
    chooseCoverage: 'Choose the coverage',
    chooseCoverageHover: 'Choose the cards in the stack by course chapters',
    chooseCompetency: 'Choose competency levels',
    chooseCompetencyHover:
      'Choose the competency levels (estimated by the learner model) up to which cards should be included into the card stack',
    chooseCompetencyDetails:
      'The selection will put all cards up to the chosen competency level onto the stack.',
    shuffleCards: 'Shuffle drill cards',
    revise: 'Revise',
    drill: 'Drill',
    concepts: 'Concepts',
    cardsSelected: 'cards selected',

    assessYourComptence: 'Assess Your Competence',
    flipCard: 'Flip the card to see the definition!',
    flipBack: 'Flip back!',
    prev: 'Prev',
    next: 'Next',
    showBackface: 'Show backface by default',
    leaveEarly: 'Are you sure you want to leave the drill early?',

    goBack: 'Go Back',
    rememberedAndUnderstood: 'Concepts remembered and understood',
    rememberedNotUnderstood: 'Concepts remembered but not understood',
    understoodNotRemembered: 'Concepts understood but not remembered',
    notRememberedNotUnderstood: 'Concepts neither remembered nor understood',

    concept: 'Concept',
    remember: 'Remember',
    understand: 'Understand',
  },
  quiz: {
    upcomingQuizzes: 'Upcoming Quizzes',
    quizDashboard: 'Quiz Dashboard',
    demoQuiz: 'Demo Quiz',
    previousQuizzes: 'Previous Quizzes',
    ongoingQuizzes: 'On-going Quizzes',
    onTimeWarning:
      'This page gives you an overview over the upcoming quizzes in the {courseId} lectures. Note that start and end times are strict. So be on time.',
    this: 'This',
    demoQuizText:
      'is a demo quiz - so that you can test your hard/software (you will need a recent chrome or firefox browser) and see the format. In particular, you should be able to read the Math in the travelling salesperson problem.',
    practiceProblems: 'Practice Problems',
    enrollmentMessage: 'Please enroll in the course to access quizzes and homework.',
    getEnrolled: 'Get Enrolled',
    numberofStudentEnrolled: 'students are already enrolled',
  },
  homework: {
    homeworkDashboard: 'Homework Dashboard',
    homeworkDashboardDescription:
      'This page gives you an overview over the upcoming Homeworks in the {courseId} lectures. ',
    givenHomeworks: 'Given Homeworks',
  },
  vis: {
    goToTour: 'Go To Tour',
  },
  myProfile: {
    profile: 'Profile',
    Settings: 'Settings',
    dataExport: 'Data Export',
    personalInfo: 'Personal Information',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    languages: 'Languages spoken',
    studyProgram: 'Study Program',
    semester: 'Enrolled semester',
    save: 'Save',

    dataAlea: 'Your Data in ALᴇA',
    displaySettings: 'Display Settings',
    accountInformation: 'Account Information',

    myNotes: 'My notes',
    myCompetencyData: 'My competency data',
    learnerModelPriming: 'Learner Model Priming',
    myAnswers: 'My Answers',
    myGrading: 'My Grading',
    downloadData: 'Download Your Data',
    downloadNotes: 'Download your notes and comments',
    downloadProfile: 'Download your profile data',
    dataDeletion: 'Data Deletion',
    purgeData: 'Purge your data',

    choosePersona: 'Choose Persona',
    resetFake: 'Reset Fake User Data',

    confirmPurge: 'Confirm Data Purge',
    purgeWarning:
      'WARNING: This will delete all data the system has on you (learner model, interaction logs, comments, and notes) except for the information that/when you purged the data. Your learning experience may be significantly affected.',
    dataPurged: 'Data purged',
    purgeError: 'Some error purging data',
    purge: 'Purge',
    cancel: 'Cancel',
    confirmation: 'Confirmation',
    confirmText: 'Purge my data',
    purgeInstruction: 'Enter this text in the box below to confirm',
    calendar: {
      copyCalendarUrl: 'Copy Calendar URL',
      howTo: 'How to Add Calendar to Google Calendar',
      stepOne: 'The URL has been copied to your clipboard.',
      stepTwo: 'Open Google Calendar in your browser.',
      stepThree: 'On the left, click on “Other calendars” → “+”.',
      stepFour: 'Select “From URL”.',
      stepFive: 'Paste the copied URL and click “Add calendar”.',
    },
  },
  myLearnerModel: {
    learnerModel: 'Learner Model',
    description1:
      'Using your interactions with the system, we strive to estimate your competency of various concepts. We use the Bloom extended model',
    description2:
      ', which classifies learner competencies in six cognitive dimensions for every concept. As a consequence, you see six probability values representing the predicted competency of that concept. This competency model (a.k.a. learner model) is used in all of the semantic services in ALeA.',
  },
  courseView: {
    notes: 'Notes',
    instructorNotes: "Instructor's notes",
    showSlides: 'Show slides',
    showVideo: 'Show video',
    hideVideo: 'Hide video',
    showSlidesAndVideo: 'Show slides and video',
    courseContent: 'Course Content',
    personalizedSuggestion: 'Personalized Suggestion',
  },
  forum: {
    showReferredContent: 'Show referred content',
    askAQuestion: 'Ask A Question',
    post: 'Post',
    postAnonymously: 'Post Anonymously',
    enterQuestion: 'Write your question here...',
    showRemarks: 'Show remarks',
    showOnlyUnanswered: 'Show only unanswered',
  },
  // Multi-Page Components
  header: {
    headerWarning:
      'WARNING: Research Prototype, it may misbehave, crash, delete data, ... or even make you happy without warning at any time!',
    login: 'Login',
    profile: 'Profile',
    logOut: 'Log Out',
    helpCenter: 'Help Center',
    privacyPolicy: 'Privacy Policy',
    legalNotice: 'Legal Notice',
    changeLanguage: 'Change Language',
  },
  learnerModelPriming: {
    learnerModelPriming: 'Learner Model Priming',
    loginToContinue: 'Please log in (with your FAU IDM credentials) to continue',
    intro:
      'A great part of the ALᴇA services depends on the quality of the ' +
      "ALᴇA learner model data - a subsystem that models the learner's knowledge/competency " +
      "of the concepts underlying the learning materials by monitoring learners' " +
      'interactions with/in the ALᴇA system. The system will try its best to serve you by ' +
      'taking inputs from you in an unintrusive way. However, to make our services more ' +
      'effective right from the beginning of your journey, we request you to share your past ' +
      'academic record so that we can have a reasonable initial estimate of your learner model.',
    disclaimer:
      'The grades you give below will only be used for priming the learner model, ' +
      'which in turn will only be used to give you a better learning experience. ' +
      'In particular, they are not used in any future grading of the courses.',
    note: 'Note',
    note1:
      'You may have taken some other courses that cover the topics specified ' +
      'in some of the courses listed below. In such a case, please use your best ' +
      'judgment to assign a grade to the course.',
    note2:
      'It is preferred that you enter your scores in the German grade scale ' +
      '(1.0-5.0). If you are unable to convert your scores ' +
      'to this scale, you can enter your scores as percentages.',
    note3:
      'Once submitted, these grades can be reset only after resetting ' +
      'your learner model. So please be careful while entering the grades.',
    course: 'Course',
    grade: 'Grade',
    percentage: 'Percentage',
    submit: 'Submit',
    submitConfirmation: 'Submit grade information?',
    submitSuccess: 'Grade information submitted successfully!',
  },
  courseHome: {
    title: 'Course Home',
    currentSemester: 'Current Semester',
    recordedSyllabus: 'Recorded Syllabus',
    date: 'Date',
    topics: 'Topics',
    video: 'Video',
  },
  studyBuddy: {
    fillForm: 'Fill in the following form to find buddies to study together.',
    agreementText:
      'I understand that this information will be used to find and connect to other study buddy connect users.',
    join: 'Join',
    update: 'Update',
    discard: 'Discard',
    loginToContinue: 'Please log in (with your FAU IDM credentials) to continue',
    myProfile: 'My Profile',
    editInfo: 'Edit Info',
    reJoin: 'Re-join',
    optOut: 'Opt-out',
    notActive:
      "You have opted out of the study buddy program for this course. Please click 'Re-join' to search for study buddies.",
    semester: 'semester',
    dayPreference: 'Day Preference',
    meetPreference: 'Meet Preference',
    languages: 'Languages',

    connected: 'Connected',
    connectedSubtext:
      'These learners are also interested in studying together with you. Please go ahead connect with them (send them an email).',

    requestReceived: 'Request Received',
    requestReceivedSubtext:
      'These learners have requested to connect with you. Once you accept their request, you can connect with them via email.',

    requestSent: 'Request Sent',
    requestSentSubtext:
      'You have sent these learners a connection request. Please wait for them to accept your request.',

    lookingFor: 'Learners looking for a study buddy',
    lookingForSubtext:
      'These learners are looking for a study buddy. Please go ahead and send them a connection request.',

    optOutPrompt: 'Are you sure you want to leave the study buddy program for $1?',
    haveEnrolled: 'You have enrolled in the study buddy program for $1.',

    connectedAlert: 'You have connected to $1',
    connectionRequestCancelled: 'Connection request to $1 has been cancelled.',
    connectionRequestSent: 'Connection request sent to $1.',

    introLabel: 'Introduce yourself',
    studyProgramLabel: 'Study program (e.g. Masters in Computer Science)',
    semesterLabel: 'Semester #',
    nameLabel: 'Name',
    emailLabel: 'E-Mail (e.g. you@fau.de)',
    preferredDays: 'Preferred days to meet',
    meetTypeLabel: 'Preferred Meeting Type',
    languagesLabel: 'Languages you speak',

    emailWarning: 'Your email will be shared only with those users that you choose to connect to.',
    insightHeading: 'Study Buddy Insights',
    totalUsers: 'Total Users',
    activeUsers: 'Active Users',
    inactiveUsers: 'Inactive Users',
    numberOfConnections: 'Number of Connections',
    unacceptedRequest: 'Unaccepted Requests',
    allCourses: 'All Courses',
    recent: 'Recent',
    removeFromRecents: 'Remove from recent list',
    findCourse: 'Find your course to join its Study Buddy program',
    studyBuddyMasterCourse: 'Study Buddy Program for Master AI Courses',
    myEnrolledCourses: 'My Enrolled Courses',
    studyBuddyIntro:
      'Forming and maintaining study groups significantly enhances academic performance. Yet, with the rise of digital learning, connecting with like-minded peers can be challenging. Our Study Buddy Connect feature aims to bridge this gap. Simply log in to the ALᴇA system via FAU IDM, complete a study buddy request form, and match up with compatible study partners. You retain the choice to reach out to those suggested, empowering you to connect with fellow learners effectively.',
    notEnrolledMessage: `Try it out for one of your courses (you can always opt-out anytime if you don't like it). Just choose an AI course from the list below and send a study buddy request.`,
  },
  notification: {
    systemUpdates: 'System Updates',
    notifications: 'Notifications',
    allNotifications: 'See All Notifications',
  },
  quizPerformanceTable: {
    quizName: 'Quiz Name',
    quizDate: 'Quiz Date',
    maxPoints: 'Max Points',
    myScore: 'My Score',
    averageScore: 'Average Score',
    quizRecorrected: 'This quiz was re-corrected',
    theProblem: 'The problem',
    wasRecorrected: 'was re-corrected',
  },
  homeworkPerformanceTable: {
    homeworkTitle: 'Homework Title',
    givenTs: 'Given Date',
    dueTs: 'Due Date',
    feedbackReleaseTs: 'Feedback Release Date',
    maxPoints: 'Max Points',
    myScore: 'My Score',
    averageScore: 'Average Score',
  },
  homeworkManager: {
    title: 'Title',
    homeworks: 'Homeworks',
    createHomework: 'Create Homework',
    homeworkName: 'Homework Name',
    homeworkStats: 'Homework Stats',
    givenTs: 'Given Date',
    dueTs: 'Due Date',
    feedbackReleaseTs: 'Feedback Release Date',
    actions: 'Actions',
    saveHomework: 'Save Homework',
    updateHomework: 'Update Homework',
    cancel: 'Cancel',
    noHomeworksAvailable: 'No homework available.',
    viewHomeworkDocument: 'View homework document',
    showHomeworkStatistics: 'Show homework statistics',
    editHomework: 'Edit homework',
    deleteHomework: 'Delete homework',
  },
  logInSystem: {
    reset404: 'User not found.',
    reset409: 'Password reset token not set.',
    reset400: 'Invalid token',
    reset410: 'Password reset link has expired.',
    reset200: 'Password updated successfully.',
    passwordConfirm: 'Password and Confirm Password should be the same',
    passwordRegex:
      'Password must contain at least one uppercase letter, one lowercase letter, one digit, and be at least 8 characters long',
    invalidEmail: 'Invalid email address',
    signUpEmail: 'Sign up to ALᴇA with your email address',
    signUp: 'SIGN UP',
    alreadyAccount: 'Already have an account?',
    logIn: 'Log in',
    link: 'Link',
    verify200: 'Email Verified Successfully.',
    verify400: 'Invalid userId or verification token',
    signUp200: 'User Created Successfully',
    signUp400: 'Email already exists',
    verifcationMessage:
      'Your email awaits verification. Tap the button to initiate the process and receive the verification email.',
    sendVerifcationBtn: 'Send Verification Email',
    verificationEmail: 'Verification email sent successfully',
    somethingWentWrong: 'Something went wrong please try again',
  },
  practiceProblems: {
    practiceProblems: 'Practice Problems',
    practiceProblemsDescription:
      'The following problems are meant to aid your learning. They do not cover the course material exhaustively and there are no guarantees that the problems are correct or that they are representative of the kinds of problems that will be on the quizzes or the exam.',
    problems: 'problems',
    practice: 'Practice',
  },
  perSectionQuiz: {
    problemsFor: 'Problems for',
    warning:
      'Note: These problems are only to aid your learning. They do not cover the course material exhaustively and there are no guarantees that the problems are correct or that they are representative of the kinds of problems that will be on the quizzes or the exam.',
    backToAllCourseProblems: 'Back to all course problems',
  },
  peerGrading: {
    peerGrading: 'Peer Grading',
  },
  resource: {
    updatesyllabus: 'Update Syllabus',
    quiz: 'Quizzes',
    homework: 'Homeworks',
    forum: 'Forum',
    welcome: 'Welcome',
    peerReview: 'Peer Review',
    studyBuddy: 'Study Buddy',
    lastUpdated: 'Last Updated',
    ago: 'ago',
    updates: 'updates',
    pending: 'pending',
    noUpdatesAvailable: 'No updates available',
    failedToLoadUpdates: 'Failed to load updates',
    ungradedProblems: 'Ungraded Problems',
    unansweredQuestions: 'Unanswered Questions',
    latestQuiz: 'Latest Quiz',
    prepareUpcomingQuiz: 'Prepare Upcoming Quiz',
    latestHomework: 'Latest Homework',
    noHomeworkAvailable: 'No homework available',
    progress: 'Progress',
  },
  syllabus: {
    syllabusEntries: 'Syllabus Entries',
    noSyllabusEntriesYet: 'No syllabus entries yet',
    editsectionentry: 'Edit Section Entry',
    addnewsection: 'Add New Section',
    prepareUpcomingQuiz: 'Prepare Upcoming Quiz',
    latestHomework: 'Latest Homework',
    noHomeworkAvailable: 'No homework available',
    progress: 'Progress',
  },
  recorrection: {
    quizRecorrection: 'Quiz Recorrection',
    previewRecorrection: 'Preview of Recorrection Changes',
    problemId: 'Problem ID',
    recorrectionReason: 'Reason for Recorrection',
    recorrectionReasonPlaceholder: 'Please enter the reason for recorrection',
    oldpoints: 'Old Points',
    newpoints: 'New Points',
    numberOfEntries: 'Number of Entries',
    noChangetoApply: 'No changes to apply',
    loadingPreviewOfChanges: 'Loading preview of changes...',
    ApplyRecorrection: 'Apply Recorrection',
  },
  calendarSection: {
    schedule: 'Schedule',
    personalCalendar: 'Personal Calendar',
    howToUse: 'How to use',
    howToUseHintGoogle: `Open Google Calendar → click "+" next to "Other calendars" → choose "From URL" → paste the link.`,
    howToUseHintApple: `Open Apple Calendar → File → New Calendar Subscription → paste the link → press OK.`,
  },

  courseMetadata: {
    title: 'Lecture Schedule for Course ID: {{courseId}}',
    addLectureButton: 'Add Lecture',

    day: 'Day',
    venue: 'Venue',
    venueLink: 'Venue Link',
    startTime: 'Start Time',
    endTime: 'End Time',
    homework: 'Homework',
    quiz: 'Quiz',
    actions: 'Actions',
    link: 'Link',
    yes: 'Yes',
    no: 'No',
    edit: 'Edit',
    delete: 'Delete',
    editDialogTitle: 'Edit {{type}}',
    editLecture: 'Edit Lecture',
    editTutorial: 'Edit Tutorial',
    save: 'Save',
    cancel: 'Cancel',

    confirmDeleteLecture: 'Are you sure you want to delete this lecture?',
    confirmDeleteTutorial: 'Are you sure you want to delete this tutorial?',
    requiredFieldsAlert: 'Please fill all required fields: Day, Start Time, End Time',

    // Announcements
    announcementsHeader: 'Announcements for Course ID: {{courseId}}',
    newAnnouncementButton: '+ New Announcement',

    tableCourseId: 'Course ID',
    tableInstructor: 'Instructor',
    tableTitle: 'Title',
    tableContent: 'Content',
    tableCreatedAt: 'Created At',
    tableVisibleUntil: 'Visible Until',

    dialogEditAnnouncementTitle: 'Edit Announcement',
    dialogNewAnnouncementTitle: 'New Announcement',

    fieldTitle: 'Title',
    fieldContent: 'Content',
    fieldVisibleUntil: 'Visible Until',

    saveChanges: 'Save Changes',
    create: 'Create',

    confirmDeleteAnnouncementTitle: 'Confirm Deletion',
    confirmDeleteAnnouncementMessage:
      'Are you sure you want to delete this announcement? This action cannot be undone.',

    snackbarAnnouncementSaved: 'Announcement saved successfully!',
    snackbarAnnouncementSaveFailed: 'Failed to save announcement. Check console for details.',
    snackbarAnnouncementDeleted: 'Announcement deleted successfully!',
    snackbarAnnouncementDeleteFailed: 'Failed to delete announcement. Check console for details.',
    snackbarAnnouncementsFetchFailed: 'Failed to fetch announcements. Check console for details.',
    isHomeworkAvailable: 'Enable homework for this course',
  },
};
