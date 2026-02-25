import axios from 'axios';
export type CourseMaterialType = 'FILE' | 'LINK';

export interface CourseMaterial {
  id: string;
  materialName: string;
  type: CourseMaterialType;
  storageFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
}

export interface PostMaterialRequest {
  universityId: string;
  courseId: string;
  instanceId: string;
  type: CourseMaterialType;
  materialName: string;
  url?: string;
  fileBase64?: string;
  fileName?: string;
  expectedSize?: number;
}

export async function postMaterial(data: PostMaterialRequest) {
  await axios.post('/api/course-material/post-material', data);
}

export async function getMaterials(universityId: string, courseId: string, semesterId: string) {
  const resp = await axios.get('/api/course-material/get-materials', {
    params: { universityId, courseId, semesterId },
  });
  return resp.data as CourseMaterial[];
}

export async function getMaterialById(id: string) {
  const resp = await axios.get('/api/course-material/get-material-by-id', {
    params: { id },
    responseType: 'blob',
  });
  return resp.data;
}

export async function deleteMaterial(id: string) {
  await axios.post('/api/course-material/delete-material', { id });
}
