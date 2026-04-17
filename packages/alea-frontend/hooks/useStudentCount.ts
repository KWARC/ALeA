import { getStudentCountInCourse } from '@alea/spec';
import { useEffect, useState } from 'react';

export function useStudentCount(courseId?: string, instanceId?: string, reFetch?: boolean) {
  const [studentCount, setStudentCount] = useState<number | null>(null);

  useEffect(() => {
    if (!courseId || !instanceId) {
      setStudentCount(null);
      return;
    }

    getStudentCountInCourse(courseId, instanceId)
      .then((res) => {
        setStudentCount(res.studentCount ?? null);
      })
      .catch((err) => {
        console.error('Error fetching student count:', err);
        setStudentCount(null);
      });
  }, [courseId, instanceId, reFetch]);

  return studentCount;
}
