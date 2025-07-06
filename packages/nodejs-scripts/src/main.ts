import { addLectureSchedule } from './addLectureSchedule';
import { currentSemSetupScript } from './currentSemSetup';
import { quizLmsInfoWriter } from './quizLmsInfoWriter';

switch (process.env.SCRIPT_NAME) {
  case 'quizLmsInfoWriter':
    quizLmsInfoWriter();
    break;
  case 'addLectureSchedule':
    addLectureSchedule();
    break;
  case 'currentSemSetup':
    currentSemSetupScript();
    break;
  default:
    console.log('Invalid script name');
}
