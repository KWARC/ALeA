import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Link from 'next/link';

export function CourseHeader({
  courseId,
  courseName,
  imageLink,
  institutionId,
  instanceId,
}: {
  courseId: string;
  courseName: string;
  imageLink?: string;
  institutionId?: string;
  instanceId?: string | null;
}) {
  const theme = useTheme();
  if (!courseName || !courseId) return <></>;
  const courseHomeLink =
    institutionId && instanceId
      ? `/${institutionId}/${courseId}/${instanceId}`
      : `/course-home/${courseId}`;
  if (!imageLink) {
    return (
      <Box m={2.5} textAlign="center" fontWeight="bold" fontSize={32}>
        {courseName}
      </Box>
    );
  }
  const allowCrop = ['ai-1', 'ai-2', 'lbs', 'smai'].includes(courseId);
  return (
    <Box textAlign="center">
      <Link href={courseHomeLink}>
        <Box
          display="flex"
          position="relative"
          width="100%"
          maxHeight={200}
          overflow="hidden"
          borderBottom={`2px solid ${theme.palette.divider}`}
          sx={{ backgroundImage: (theme.palette as { gradients?: Record<string, string> }).gradients?.[courseId] }}
        >
          {allowCrop ? (
            <img
              src={imageLink}
              alt={courseName}
              style={{
                objectFit: 'cover',
                width: '100%',
                aspectRatio: '16/9',
              }}
            />
          ) : (
            <img
              src={imageLink}
              alt={courseName}
              style={{
                objectFit: 'contain',
                maxHeight: 200,
                margin: 'auto',
              }}
            />
          )}
        </Box>
      </Link>
      <Box
        sx={{
          mt: 2.5,
          mx: 0,
          mb: 4,
          fontWeight: 'bold',
          fontSize: 32,
        }}
      >
        {courseName}
      </Box>
    </Box>
  );
}
