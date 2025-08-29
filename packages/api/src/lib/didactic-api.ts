import { getAuthHeaders } from "./lmp";
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
    },
    headers: getAuthHeaders(),
  });

  return resp.data as ConceptPropertiesMap;
}

export async function getConceptGoalsInSection(sectionUri:string){
  const resp = await axios.get(`/api/gpt-redirect`, {
    params: {
      apiname: 'get-concept-goals-in-section',
      projectName: 'quiz-gen',
      sectionUri,
    },
    headers: getAuthHeaders(),
  });

  return resp.data as any;
}