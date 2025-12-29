import { MusicNote } from '@mui/icons-material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SettingsIcon from '@mui/icons-material/Settings';
import VideocamIcon from '@mui/icons-material/Videocam';
import CheckIcon from '@mui/icons-material/Check';
import { IconButton, Menu, MenuItem, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import { CourseInfo, getCoursePdfUrl, localStore } from '@alea/utils';
import { useState } from 'react';
import { ViewMode } from '../../pages/course-view/[courseId]';

interface CourseViewToolbarIconsProps {
  audioOnly: boolean;
  resolution: number;
  courseId: string;
  courses: { [id: string]: CourseInfo } | undefined;
  viewMode: ViewMode;
  onAudioOnlyToggle: () => void;
  onResolutionChange: (resolution: number) => void;
}

const availableResolutions = [360, 720, 1080];

export default function CourseViewToolbarIcons({
  audioOnly,
  resolution,
  courseId,
  courses,
  viewMode,
  onAudioOnlyToggle,
  onResolutionChange,
}: CourseViewToolbarIconsProps) {
  const [resolutionAnchorEl, setResolutionAnchorEl] = useState<null | HTMLElement>(null);
  const isVideoHidden = viewMode === ViewMode.SLIDE_MODE;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <>
      <Tooltip title={audioOnly ? 'Show Video' : 'Audio Only'} placement="bottom">
        <IconButton
          onClick={onAudioOnlyToggle}
          disabled={isVideoHidden}
          size={isMobile ? 'small' : 'medium'}
          sx={{
            border: { xs: '1.5px solid', sm: '2px solid' },
            borderColor: audioOnly ? '#1976d2' : '#9e9e9e',
            borderRadius: { xs: 1.5, sm: 2 },
            bgcolor: audioOnly ? '#e3f2fd' : 'white',
            color: audioOnly ? '#1976d2' : '#616161',
            opacity: isVideoHidden ? 0.5 : 1,
            padding: { xs: '6px', sm: '8px' },
            '&:hover': {
              bgcolor: audioOnly ? '#bbdefb' : '#f5f5f5',
            },
            '&.Mui-disabled': {
              borderColor: '#9e9e9e',
              bgcolor: 'white',
              color: '#9e9e9e',
            },
          }}
        >
          {audioOnly ? (
            <VideocamIcon fontSize={isMobile ? 'small' : 'medium'} />
          ) : (
            <MusicNote fontSize={isMobile ? 'small' : 'medium'} />
          )}
        </IconButton>
      </Tooltip>

      {!audioOnly && !isVideoHidden && (
        <>
          <Tooltip title="Video Quality" placement="bottom">
            <IconButton
              onClick={(e) => setResolutionAnchorEl(e.currentTarget)}
              size={isMobile ? 'small' : 'medium'}
              sx={{
                border: { xs: '1.5px solid #9e9e9e', sm: '2px solid #9e9e9e' },
                borderRadius: { xs: 1.5, sm: 2 },
                bgcolor: 'white',
                color: '#616161',
                padding: { xs: '6px', sm: '8px' },
                '&:hover': {
                  bgcolor: '#f5f5f5',
                },
              }}
            >
              <SettingsIcon fontSize={isMobile ? 'small' : 'medium'} />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={resolutionAnchorEl}
            open={Boolean(resolutionAnchorEl)}
            onClose={() => setResolutionAnchorEl(null)}
          >
            {availableResolutions.map((res) => (
              <MenuItem
                key={res}
                onClick={() => {
                  onResolutionChange(res);
                  localStore?.setItem('defaultResolution', res.toString());
                  setResolutionAnchorEl(null);
                }}
              >
                <CheckIcon
                  fontSize="small"
                  sx={{ color: res === resolution ? undefined : '#00000000' }}
                />
                &nbsp;{res}p
              </MenuItem>
            ))}
          </Menu>
          {/* <Tooltip
            title={showPresentationVideo ? 'Show slides' : 'Show presentation video'}
            placement="bottom"
          >
            <IconButton
              onClick={onPresentationVideoToggle}
              size={isMobile ? 'small' : 'medium'}
              sx={{
                border: { xs: '1.5px solid', sm: '2px solid' },
                borderColor: showPresentationVideo ? '#1976d2' : '#9e9e9e',
                borderRadius: { xs: 1.5, sm: 2 },
                bgcolor: showPresentationVideo ? '#e3f2fd' : 'white',
                color: showPresentationVideo ? '#1976d2' : '#616161',
                padding: { xs: '6px', sm: '8px' },
                '&:hover': {
                  bgcolor: showPresentationVideo ? '#bbdefb' : '#f5f5f5',
                },
              }}
            >
              <SlideshowIcon fontSize={isMobile ? 'small' : 'medium'} />
            </IconButton>
          </Tooltip> */}
        </>
      )}

      {courses?.[courseId]?.slides && (
        <Tooltip title="Download slides PDF" placement="bottom">
          <IconButton
            onClick={() => {
              const slides = courses?.[courseId]?.slides;
              const notes = courses?.[courseId]?.notes;
              const sourceUri = slides || notes;
              if (!sourceUri) return;
              const pdfUrl = getCoursePdfUrl(sourceUri);
              window.open(pdfUrl, '_blank');
            }}
            size={isMobile ? 'small' : 'medium'}
            sx={{
              border: { xs: '1.5px solid', sm: '2px solid' },
              borderColor: '#1976d2',
              borderRadius: { xs: 1.5, sm: 2 },
              bgcolor: 'white',
              color: '#1976d2',
              padding: { xs: '6px', sm: '8px' },
              '&:hover': {
                bgcolor: '#e3f2fd',
                borderColor: '#1565c0',
              },
            }}
          >
            <PictureAsPdfIcon fontSize={isMobile ? 'small' : 'medium'} />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
