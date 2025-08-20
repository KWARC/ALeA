import React, { useEffect, useState } from 'react';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from '@mui/material';
import { getCourseInfo, getCouseIdsOfSemester } from 'packages/api/src/lib/flams';
import { aclExists } from 'packages/utils/src/lib/semester-helper';
import { createAcl } from 'packages/api/src/lib/access-control-api';
import AclDisplay from '../AclDisplay';

interface CourseManagementProps {
  semester: string;
  universityId: string;
  disabled?: boolean;
}

export const CourseManagement: React.FC<CourseManagementProps> = ({
  semester,
  universityId,
  disabled = false,
}) => {
  const [courses, setCourses] = useState<string[]>([]);
  const [aclPresence, setAclPresence] = useState<Record<string, boolean>>({});
  const [aclIds, setAclIds] = useState<Record<string, string>>({});

  const hasCourses = courses.length > 0;

  useEffect(() => {
    async function fetchCoursesAndAcls() {
      const courses = await getCouseIdsOfSemester(semester);
      setCourses(courses);
      const aclChecks: Record<string, boolean> = {};
      const aclIdMap: Record<string, string> = {};
      await Promise.all(
        courses.map(async (courseId) => {
          const aclId = `${courseId.toLowerCase()}-${semester}-instructors`;
          aclIdMap[courseId] = aclId;
          aclChecks[courseId] = await aclExists(aclId);
        })
      );
      setAclPresence(aclChecks);
      setAclIds(aclIdMap);
    }
    fetchCoursesAndAcls();
  }, [semester, universityId]);

  const handleCreateAcl = async (aclId: string, courseId: string) => {
    try {
      await createAcl({
        id: aclId,
        description: `Instructor ACL for ${aclId}`,
        isOpen: false,
        updaterACLId: `${universityId.toLocaleLowerCase()}-admin`,
        memberUserIds: [],
        memberACLIds: [],
      });
      const exists = await aclExists(aclId);
      setAclPresence((prev) => ({ ...prev, [courseId]: exists }));
    } catch (error) {
      console.error('Failed to create ACL:', error);
    }
  };

  return (
    <Paper elevation={2} sx={{ mb: 4, p: 2, borderRadius: 3, background: '#fff' }}>
      <Typography
        variant="h6"
        gutterBottom
        sx={{ color: 'primary.dark', fontWeight: 600 }}
      >
        Course Management
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ background: '#e3f0ff' }}>
              <TableCell sx={{ fontWeight: 600 }}>CourseId</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Instructors</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!hasCourses ? (
              <TableRow>
                <TableCell colSpan={2} align="center">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              courses.map((courseId, idx) => (
                <TableRow
                  key={courseId}
                  sx={{
                    backgroundColor: idx % 2 === 0 ? '#f5f7fa' : '#e9eef6',
                    '&:hover': { backgroundColor: '#e3f0ff' },
                    transition: 'background 0.2s',
                  }}
                >
                  <TableCell>{courseId}</TableCell>
                  <TableCell>
                    {aclPresence[courseId] === undefined ? (
                      'Checking...'
                    ) : aclPresence[courseId] ? (
                      <AclDisplay aclId={aclIds[courseId]} />
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleCreateAcl(aclIds[courseId], courseId)}
                        disabled={disabled}
                      >
                        Create Instructor ACL
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}; 