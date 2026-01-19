import axios from "axios";

interface ConceptProperty {
  description?: string;
  prop: string;
}
interface ConceptPropertiesMap {
  [conceptUri: string]: ConceptProperty[];
}
export async function getConceptPropertyInSection(sectionUri:string){
  const resp = await axios.get(`/api/gpt-redirect`, {
    params: {
      apiname: 'get-concept-properties-in-section',
      projectName: 'quiz-gen',
      sectionUri,
    }
  });

  return resp.data as ConceptPropertiesMap;
}
export interface Goal{
uri:string;
text:string;
subGoalUris?:string[]
}
interface GoalsData{
  allGoals:Goal[];
  topLevelGoalUris:string[]
}
export async function getSectionGoals(courseNotesUri:string,sectionUri:string){
  const resp = await axios.get(`/api/gpt-redirect`, {
    params: {
      apiname: 'get-section-goals',
      projectName: 'quiz-gen',
      courseUri:courseNotesUri,
      sectionUri
    }
  });

  return resp.data as GoalsData;
}