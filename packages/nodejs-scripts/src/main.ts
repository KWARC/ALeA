import { addLectureSchedule } from './addLectureSchedule';
import { currentSemSetupScript } from './currentSemSetup';
import { quizLmsInfoWriter } from './quizLmsInfoWriter';
import { updateGradingDatabase } from './updateGradingDatabase';
import { exportGradingToCsv } from './exportGradingToCsv';

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
  case 'updateGradingDatabase':
    updateGradingDatabase();
    break;
  case 'exportGradingToCsv':
    exportGradingToCsv();
    break;
  default:
    console.log('Invalid script name');
}
