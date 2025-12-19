import { addLectureSchedule } from './addLectureSchedule';
import { currentSemSetupScript } from './currentSemSetup';
import { loadTest } from './loadTest';
//import { quizLmsInfoWriter } from './quizLmsInfoWriter';
//import { exportGradingToCsv } from './exportGradingToCsv';
//import { updateGradingDatabase } from './updateGradingDatabase';

switch (process.env.SCRIPT_NAME) {
  case 'addLectureSchedule':
    addLectureSchedule();
    break;
  case 'currentSemSetup':
    currentSemSetupScript();
    break;
  //case 'updateGradingDatabase':
  //  updateGradingDatabase();
   // break;
  //case 'exportGradingToCsv':
  //  exportGradingToCsv();
  //  break;
  // case 'quizLmsInfoWriter':
  //  quizLmsInfoWriter();
  //  break;
  case 'loadTest':
    loadTest();
    break;
  default:
    console.log('Invalid script name');
}
