import { MusicNote } from '@mui/icons-material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SettingsIcon from '@mui/icons-material/Settings';
import VideocamIcon from '@mui/icons-material/Videocam';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import CheckIcon from '@mui/icons-material/Check';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import { CourseInfo, getCoursePdfUrl, localStore } from '@alea/utils';
import { useState } from 'react';

interface CourseViewToolbarIconsProps {
  audioOnly: boolean;
  resolution: number;
  showPresentationVideo: boolean;
  courseId: string;
  courses: { [id: string]: CourseInfo } | undefined;
  onAudioOnlyToggle: () => void;
  onResolutionChange: (resolution: number) => void;
  onPresentationVideoToggle: () => void;
}

const availableResolutions = [360, 720, 1080];

export default function CourseViewToolbarIcons({
  audioOnly,
  resolution,
  showPresentationVideo,
  courseId,
  courses,
  onAudioOnlyToggle,
  onResolutionChange,
  onPresentationVideoToggle,
}: CourseViewToolbarIconsProps) {
  const [resolutionAnchorEl, setResolutionAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <>
      <Tooltip title={audioOnly ? 'Show Video' : 'Audio Only'} placement="bottom">
        <IconButton
          onClick={onAudioOnlyToggle}
          sx={{
            border: '2px solid',
            borderColor: audioOnly ? '#1976d2' : '#9e9e9e',
            borderRadius: 2,
            bgcolor: audioOnly ? '#e3f2fd' : 'white',
            color: audioOnly ? '#1976d2' : '#616161',
            '&:hover': {
              bgcolor: audioOnly ? '#bbdefb' : '#f5f5f5',
            },
          }}
        >
          {audioOnly ? <VideocamIcon /> : <MusicNote />}
        </IconButton>
      </Tooltip>

      {!audioOnly && (
        <>
          <Tooltip title="Video Quality" placement="bottom">
            <IconButton
              onClick={(e) => setResolutionAnchorEl(e.currentTarget)}
              sx={{
                border: '2px solid #9e9e9e',
                borderRadius: 2,
                bgcolor: 'white',
                color: '#616161',
                '&:hover': {
                  bgcolor: '#f5f5f5',
                },
              }}
            >
              <SettingsIcon />
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
          <Tooltip
            title={showPresentationVideo ? 'Show slides' : 'Show presentation video'}
            placement="bottom"
          >
            <IconButton
              onClick={onPresentationVideoToggle}
              sx={{
                border: '2px solid',
                borderColor: showPresentationVideo ? '#1976d2' : '#9e9e9e',
                borderRadius: 2,
                bgcolor: showPresentationVideo ? '#e3f2fd' : 'white',
                color: showPresentationVideo ? '#1976d2' : '#616161',
                '&:hover': {
                  bgcolor: showPresentationVideo ? '#bbdefb' : '#f5f5f5',
                },
              }}
            >
              <SlideshowIcon />
            </IconButton>
          </Tooltip>
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
            sx={{
              border: '2px solid',
              borderColor: '#1976d2',
              borderRadius: 2,
              bgcolor: 'white',
              color: '#1976d2',
              '&:hover': {
                bgcolor: '#e3f2fd',
                borderColor: '#1565c0',
              },
            }}
          >
            <PictureAsPdfIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}

