import axios from 'axios';
export type CourseMaterialType = 'FILE' | 'LINK';

export interface CourseMaterial {
  id: string;
  materialName: string;
  type: CourseMaterialType;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
  createdAt?: string;
}

export interface PostMaterialRequest {
  universityId: string;
  courseId: string;
  instanceId: string;
  type: CourseMaterialType;
  materialName: string;
  url?: string;
}

export async function postMaterial(data: FormData) {
  await axios.post('/api/course-material/post-material', data);
}

export async function getMaterials(universityId: string, courseId: string, instanceId: string) {
  const resp = await axios.get('/api/course-material/get-materials', {
    params: { universityId, courseId, instanceId },
  });
  return resp.data as CourseMaterial[];
}

export async function getMaterialFileById(id: string, download?: boolean) {
  const resp = await axios.get('/api/course-material/get-material-file-by-id', {
    params: { id, download },
    responseType: 'blob',
  });
  return resp.data;
}
export async function deleteMaterial(id: string) {
  await axios.post('/api/course-material/delete-material', { id });
}

export function getMaterialFileUrl(id: string, download?: boolean): string {
  const params = new URLSearchParams({ id });
  if (download) params.set('download', 'true');
  return `/api/course-material/get-material-file-by-id?${params.toString()}`;
}
