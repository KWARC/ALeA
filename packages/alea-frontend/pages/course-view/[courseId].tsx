import { SafeFTMLFragment } from '@alea/stex-react-renderer';
import { contentToc } from '@flexiformal/ftml-backend';
import { FTML, injectCss } from '@flexiformal/ftml';
import { VideoCameraBack } from '@mui/icons-material';
import ArticleIcon from '@mui/icons-material/Article';
import CheckIcon from '@mui/icons-material/Check';
import { MusicNote } from '@mui/icons-material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SettingsIcon from '@mui/icons-material/Settings';
import VideocamIcon from '@mui/icons-material/Videocam';
import { Box, Button, CircularProgress, Typography, Container, Paper, Stack, Menu, MenuItem } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import {
  canAccessResource,
  ClipInfo,
  ClipMetadata,
  getAllCourses,
  getSlideCounts,
  getSlideDetails,
  getSlideUriToIndexMapping,
  SectionInfo,
  Slide,
} from '@alea/spec';
import { CommentNoteToggleView } from '@alea/comments';
import { SafeHtml } from '@alea/react-utils';
import { ContentDashboard, LayoutWithFixedMenu, SectionReview } from '@alea/stex-react-renderer';
import { Action, CourseInfo, getCoursePdfUrl, localStore, ResourceName, shouldUseDrawer } from '@alea/utils';
import axios from 'axios';
import { NextPage } from 'next';
import Link from 'next/link';
import { NextRouter, useRouter } from 'next/router';
import QuizComponent from 'packages/alea-frontend/components/GenerateQuiz';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useCurrentTermContext } from '../../contexts/CurrentTermContext';
import { getSlideUri, SlideDeck } from '../../components/SlideDeck';
import { SlidesUriToIndexMap, VideoDisplay } from '../../components/VideoDisplay';
import { getLocaleObject } from '../../lang/utils';
import MainLayout from '../../layouts/MainLayout';

function RenderElements({ elements }: { elements: string[] }) {
  return (
    <>
      {elements.map((e, idx) => (
        <Fragment key={idx}>
          <SafeFTMLFragment fragment={{ type: 'HtmlString', html: e, uri: undefined }} />
          {idx < elements.length - 1 && <Box sx={{ my: 1 }} />}
        </Fragment>
      ))}
    </>
  );
}

export enum ViewMode {
  SLIDE_MODE = 'SLIDE_MODE',
  COMBINED_MODE = 'COMBINED_MODE',
}

function ToggleModeButton({
  viewMode,
  updateViewMode,
}: {
  viewMode: ViewMode;
  updateViewMode: (mode: ViewMode) => void;
}) {
  const router = useRouter();
  const { courseView: t } = getLocaleObject(router);

  const isCombinedMode = viewMode === ViewMode.COMBINED_MODE;
  const buttonLabel = isCombinedMode ? t.hideVideo : t.showVideo;

  return (
    <Button
      variant={isCombinedMode ? 'contained' : 'outlined'}
      onClick={() => {
        const newMode = isCombinedMode ? ViewMode.SLIDE_MODE : ViewMode.COMBINED_MODE;
        updateViewMode(newMode);
      }}
      startIcon={<VideoCameraBack />}
      sx={{
        borderRadius: 2,
        textTransform: 'none',
        fontWeight: 500,
        px: { xs: 2, sm: 3 },
        py: 1,
        fontSize: { xs: '0.875rem', sm: '0.9375rem' },
        whiteSpace: 'nowrap',
        minWidth: { xs: 'auto', sm: '140px' },
      }}
    >
      {buttonLabel}
    </Button>
  );
}

function populateClipIds(sections: SectionInfo[], clipIds: { [sectionId: string]: string }) {
  for (const section of sections) {
    clipIds[section.id] = section.clipId;
    populateClipIds(section.children, clipIds);
  }
}

function populateSlidesClipInfos(
  sections: SectionInfo[],
  slidesClipInfo: {
    [sectionId: string]: {
      [slideUri: string]: ClipInfo[];
    };
  }
) {
  for (const section of sections) {
    slidesClipInfo[section.id] = section.clipInfo;
    populateSlidesClipInfos(section.children, slidesClipInfo);
  }
}

export function setSlideNumAndSectionId(router: NextRouter, slideNum: number, sectionId?: string) {
  const { pathname, query } = router;
  const courseId = query.courseId as string;
  if (sectionId) {
    query.sectionId = sectionId;
    localStore?.setItem(`lastReadSectionId-${courseId}`, sectionId);
  }
  query.slideNum = `${slideNum}`;
  localStore?.setItem(`lastReadSlideNum-${courseId}`, `${slideNum}`);
  router.push({ pathname, query });
}

function getSections(tocElems: FTML.TocElem[]): string[] {
  const sectionIds: string[] = [];
  for (const tocElem of tocElems) {
    if (tocElem.type === 'Section') {
      sectionIds.push(tocElem.id);
    }
    if ('children' in tocElem) {
      sectionIds.push(...getSections(tocElem.children));
    }
  }
  return sectionIds;
}

function findSection(
  toc: FTML.TocElem[],
  sectionId: string
): Extract<FTML.TocElem, { type: 'Section' }> | undefined {
  for (const tocElem of toc) {
    if (tocElem.type === 'Section' && tocElem.id === sectionId) {
      return tocElem;
    }
    if ('children' in tocElem) {
      const result = findSection(tocElem.children, sectionId);
      if (result) return result;
    }
  }
  return undefined;
}

const CourseViewPage: NextPage = () => {
  const router = useRouter();
  const courseId = router.query.courseId as string;
  const sectionId = router.query.sectionId as string;
  const slideNum = +((router.query.slideNum as string) || 0);
  const viewModeStr = router.query.viewMode as string;
  const viewMode = ViewMode[viewModeStr as keyof typeof ViewMode];
  const audioOnlyStr = router.query.audioOnly as string;
  const audioOnly = audioOnlyStr === 'true';
  const { currentTermByCourseId } = useCurrentTermContext();
  const currentTerm = currentTermByCourseId[courseId];

  const [showDashboard, setShowDashboard] = useState(!shouldUseDrawer());
  const [preNotes, setPreNotes] = useState([] as string[]);
  const [postNotes, setPostNotes] = useState([] as string[]);
  const [courseSections, setCourseSections] = useState<string[]>([]);
  const [slideCounts, setSlideCounts] = useState<{
    [sectionId: string]: number;
  }>({});
  const [slidesUriToIndexMap, setSlidesUriToIndexMap] = useState<SlidesUriToIndexMap>({});
  const [clipIds, setClipIds] = useState<{ [sectionId: string]: string }>({});
  const [slidesClipInfo, setSlidesClipInfo] = useState<{
    [sectionId: string]: {
      [slideUri: string]: ClipInfo[];
    };
  }>({});
  const [currentClipId, setCurrentClipId] = useState('');
  const [videoExtractedData, setVideoExtractedData] = useState<{
    [timestampSec: number]: ClipMetadata;
  }>({});
  const [currentSlideClipInfo, setCurrentSlideClipInfo] = useState<ClipInfo>(null);
  const { courseView: t, home: tHome } = getLocaleObject(router);
  const [courses, setCourses] = useState<{ [id: string]: CourseInfo } | undefined>(undefined);
  const [timestampSec, setTimestampSec] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [compositeActive, setCompositeActive] = useState(false);
  const [toc, setToc] = useState<FTML.TocElem[]>([]);
  const [currentSlideUri, setCurrentSlideUri] = useState<string>('');
  const [isQuizMaker, setIsQUizMaker] = useState(false);
  const [resolution, setResolution] = useState(720);
  const [resolutionAnchorEl, setResolutionAnchorEl] = useState<null | HTMLElement>(null);
  const availableResolutions = [360, 720, 1080];

  const selectedSectionTOC = useMemo(() => {
    return findSection(toc, sectionId);
  }, [toc, sectionId]);

  const handleVideoLoad = (status) => {
    setVideoLoaded(status);
  };

  useEffect(() => {
    if (!courseId || !currentTerm) return;
    const checkAccess = async () => {
      const hasAccess = await canAccessResource(ResourceName.COURSE_QUIZ, Action.MUTATE, {
        courseId,
        instanceId: currentTerm,
      });
      setIsQUizMaker(hasAccess);
    };
    checkAccess();
  }, [courseId, currentTerm]);

  useEffect(() => {
    getAllCourses().then(setCourses);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const notes = courses?.[courseId]?.notes;
    if (!notes) return;
    contentToc({ uri: notes }).then(([css, toc] = [[], []]) => {
      setToc(toc);
      setCourseSections(getSections(toc));
      injectCss(css);
    });
    getSlideCounts(courseId).then(setSlideCounts);
    getSlideUriToIndexMapping(courseId).then(setSlidesUriToIndexMap);
  }, [router.isReady, courses, courseId]);

  useEffect(() => {
    if (!router.isReady || !courseId?.length) return;
    axios.get(`/api/get-section-info/${courseId}`).then((r) => {
      const clipIds = {};
      populateClipIds(r.data, clipIds);
      setClipIds(clipIds);
      const slidesClipInfo = {};
      populateSlidesClipInfos(r.data, slidesClipInfo);
      setSlidesClipInfo(slidesClipInfo);
    });
  }, [courseId, router.isReady]);

  useEffect(() => {
    if (!router.isReady || !courseId?.length || !currentClipId) return;
    getSlideDetails(courseId, currentClipId)
      .then(setVideoExtractedData)
      .catch((err) => {
        setVideoExtractedData(null);
        console.error(err);
      });
  }, [courseId, currentClipId, router.isReady]);

  useEffect(() => {
    if (!router.isReady) return;
    if (sectionId && slideNum && viewMode && audioOnlyStr) return;
    const { pathname, query } = router;
    let someParamMissing = false;
    if (!sectionId) {
      someParamMissing = true;
      const inStore = localStore?.getItem(`lastReadSectionId-${courseId}`);
      if (inStore?.length) {
        query.sectionId = inStore;
      } else {
        const firstSection = Object.keys(slideCounts)?.[0];
        if (firstSection) query.sectionId = firstSection;
      }
    }
    if (!slideNum) {
      someParamMissing = true;
      query.slideNum = localStore?.getItem(`lastReadSlideNum-${courseId}`) || '1';
    }
    if (!viewMode) {
      someParamMissing = true;
      query.viewMode = localStore?.getItem('defaultMode') || ViewMode.COMBINED_MODE.toString();
    }
    if (!audioOnlyStr) {
      someParamMissing = true;
      query.audioOnly = localStore?.getItem('audioOnly') || 'false';
    }
    if (someParamMissing) router.replace({ pathname, query });
  }, [router, router.isReady, sectionId, slideNum, viewMode, courseId, audioOnlyStr, slideCounts]);

  useEffect(() => {
    if (!sectionId) return;
    const newClipId = clipIds?.[sectionId];
    setCurrentClipId(newClipId);
  }, [slidesClipInfo, clipIds, sectionId]);

  function goToPrevSection() {
    const secIdx = courseSections.indexOf(sectionId);
    if (secIdx === -1 || secIdx === 0) return;
    const secId = courseSections[secIdx - 1];
    setSlideNumAndSectionId(router, slideCounts[secId] ?? -1, secId);
  }

  function goToNextSection() {
    const secIdx = courseSections.indexOf(sectionId);
    if (secIdx === -1 || secIdx + 1 >= courseSections.length) return;
    const secId = courseSections[secIdx + 1];
    setSlideNumAndSectionId(router, 1, secId);
  }

  if (!router.isReady || !courses) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!courses[courseId]) {
    router.replace('/');
    return <>Course Not Found!</>;
  }

  const onClipChange = (clip: any) => {
    setCurrentClipId(clip.video_id);
    setTimestampSec(clip.start_time);
  };

  return (
    <MainLayout title={(courseId || '').toUpperCase() + ` ${tHome.courseThumb.slides} | ALeA`}>
      <LayoutWithFixedMenu
        menu={
          toc?.length > 0 && (
            <ContentDashboard
              key={courseId}
              courseId={courseId}
              toc={toc}
              selectedSection={sectionId}
              onClose={() => setShowDashboard(false)}
              onSectionClick={(sectionId: string) => {
                setSlideNumAndSectionId(router, 1, sectionId);
              }}
            />
          )
        }
        topOffset={64}
        showDashboard={showDashboard}
        setShowDashboard={setShowDashboard}
        drawerAnchor="left"
      >
        <Box sx={{ minHeight: '100vh', bgcolor: '#f8f9fa' }}>
          <Container 
            maxWidth="xl" 
            sx={{ 
              py: { xs: 2, sm: 3, md: 4 },
              px: { xs: 2, sm: 3 }
            }}
          >
            <Paper 
              elevation={1} 
              sx={{ 
                p: { xs: 1.5, sm: 2 },
                mb: { xs: 2, sm: 3 },
                borderRadius: 2,
                bgcolor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={{ xs: 1.5, sm: 2 }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
              >
                <Stack 
                  direction="row" 
                  spacing={1} 
                  alignItems="center"
                  sx={{ 
                    flexWrap: 'wrap',
                    gap: 1
                  }}
                >
                  <ToggleModeButton
                    viewMode={viewMode}
                    updateViewMode={(mode) => {
                      const modeStr = mode.toString();
                      localStore?.setItem('defaultMode', modeStr);
                      router.query.viewMode = modeStr;
                      router.replace(router);
                    }}
                  />
                  <Tooltip title={audioOnly ? 'Show Video' : 'Audio Only'} placement="bottom">
                    <IconButton
                      onClick={() => {
                        const newAudioOnly = !audioOnly;
                        localStore?.setItem('audioOnly', String(newAudioOnly));
                        router.query.audioOnly = String(newAudioOnly);
                        router.replace(router);
                      }}
                      sx={{
                        border: '2px solid',
                        borderColor: audioOnly ? '#1976d2' : '#9e9e9e',
                        borderRadius: 2,
                        bgcolor: audioOnly ? '#e3f2fd' : 'white',
                        color: audioOnly ? '#1976d2' : '#616161',
                        '&:hover': {
                          bgcolor: audioOnly ? '#bbdefb' : '#f5f5f5',
                        }
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
                            }
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
                              setResolution(res);
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
                          }
                        }}
                      >
                        <PictureAsPdfIcon />
                      </IconButton>
                    </Tooltip>
                  )}

                </Stack>
                
                <Link href={courses[courseId]?.notesLink ?? ''} passHref>
                  <Button 
                    variant="contained" 
                    startIcon={<ArticleIcon />}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      px: 3,
                      whiteSpace: 'nowrap',
                      bgcolor: '#1976d2',
                      color: 'white',
                      '&:hover': {
                        bgcolor: '#1565c0',
                      }
                    }}
                  >
                    {t.notes}
                  </Button>
                </Link>
              </Stack>
            </Paper>
            {selectedSectionTOC && (
              <Paper 
                elevation={1}
                sx={{ 
                  p: { xs: 2, sm: 2.5 },
                  mb: { xs: 2, sm: 3 },
                  borderRadius: 2,
                  bgcolor: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
              >
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 600,
                    color: '#1a1a1a',
                    fontSize: { xs: '1.25rem', sm: '1.5rem' },
                    lineHeight: 1.3
                  }}
                >
                  <SafeHtml html={selectedSectionTOC?.title || '<i>...</i>'} />
                </Typography>
              </Paper>
            )}
            <Stack
              direction={{ xs: 'column', lg: viewMode === ViewMode.COMBINED_MODE ? 'row' : 'column' }}
              spacing={{ xs: 2, sm: 3 }}
              sx={{ mb: { xs: 2, sm: 3 } }}
            >
              {viewMode === ViewMode.COMBINED_MODE && (
                <Box 
                  sx={{ 
                    flex: compositeActive ? '1 1 100%' : { xs: '1', lg: '1 1 50%' },
                    minWidth: 0
                  }}
                >
                  <Paper 
                    elevation={2}
                    sx={{ 
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: '#f5f5f5',
                      border: '1px solid #e0e0e0'
                    }}
                  >
                    <VideoDisplay
                      clipId={currentClipId}
                      clipIds={clipIds}
                      setCurrentClipId={setCurrentClipId}
                      audioOnly={audioOnly}
                      timestampSec={timestampSec}
                      setTimestampSec={setTimestampSec}
                      currentSlideClipInfo={currentSlideClipInfo}
                      videoExtractedData={videoExtractedData}
                      slidesUriToIndexMap={slidesUriToIndexMap}
                      onVideoLoad={handleVideoLoad}
                      onCompositeChange={setCompositeActive}
                    />
                  </Paper>
                </Box>
              )}

              <Box 
                sx={{ 
                  flex: compositeActive ? '0' : { xs: '1', lg: '1 1 50%' },
                  minWidth: 0,
                  display: compositeActive ? 'none' : 'block'
                }}
              >
                <Paper 
                  elevation={2}
                  sx={{ 
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'white',
                    border: '1px solid #e0e0e0'
                  }}
                >
                  <SlideDeck
                    navOnTop={viewMode === ViewMode.COMBINED_MODE}
                    courseId={courseId}
                    sectionId={sectionId}
                    onSlideChange={(slide: Slide) => {
                      setPreNotes(slide?.preNotes.map((p) => p.html) || []);
                      setPostNotes(slide?.postNotes.map((p) => p.html) || []);
                      const slideUri = getSlideUri(slide);
                      setCurrentSlideUri(slideUri || '');
                      if (
                        slidesClipInfo &&
                        slidesClipInfo[sectionId] &&
                        slidesClipInfo[sectionId][slideUri]
                      ) {
                        const slideClips = slidesClipInfo[sectionId][slideUri];
                        if (!Array.isArray(slideClips)) {
                          return;
                        }
                        const matchedClip = slideClips.find(
                          (clip) => clip.video_id === currentClipId
                        );
                        setCurrentSlideClipInfo(matchedClip || slideClips[0]);
                      } else {
                        setCurrentSlideClipInfo(null);
                      }
                    }}
                    goToNextSection={goToNextSection}
                    goToPrevSection={goToPrevSection}
                    slideNum={slideNum}
                    slidesClipInfo={slidesClipInfo}
                    onClipChange={onClipChange}
                    audioOnly={audioOnly}
                    videoLoaded={videoLoaded}
                  />
                </Paper>
              </Box>
            </Stack>
            {(preNotes.length > 0 || postNotes.length > 0) && (
              <Paper 
                elevation={1}
                sx={{
                  p: { xs: 2, sm: 3 },
                  mb: { xs: 2, sm: 3 },
                  borderRadius: 2,
                  bgcolor: '#fff9e6',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: '1px solid #ffeaa7'
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 600,
                      color: '#1a1a1a',
                      fontSize: { xs: '1rem', sm: '1.125rem' }
                    }}
                  >
                    {t.instructorNotes}
                  </Typography>
                </Stack>
                <Box sx={{ 
                  overflowX: 'auto',
                  '& > *': { mb: 1.5 }
                }}>
                  <RenderElements elements={preNotes} />
                  {preNotes.length > 0 && postNotes.length > 0 && (
                    <Box sx={{ 
                      my: 2, 
                      borderTop: '2px dashed #fdcb6e' 
                    }} />
                  )}
                  <RenderElements elements={postNotes} />
                </Box>
              </Paper>
            )}
            {selectedSectionTOC && (
              <Stack spacing={{ xs: 2, sm: 3 }}>
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: { xs: 2, sm: 3 },
                    borderRadius: 2,
                    bgcolor: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}
                >
                  <SectionReview
                    sectionUri={selectedSectionTOC.uri}
                    sectionTitle={selectedSectionTOC.title}
                  />
                </Paper>
                {isQuizMaker && (
                  <Paper 
                    elevation={1}
                    sx={{ 
                      p: { xs: 2, sm: 3 },
                      borderRadius: 2,
                      bgcolor: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                  >
                    <QuizComponent key={sectionId} courseId={courseId} sectionId={sectionId} />
                  </Paper>
                )}
              </Stack>
            )}
            <Paper 
              elevation={1}
              sx={{
                mt: { xs: 2, sm: 3 },
                borderRadius: 2,
                bgcolor: 'white',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
              }}
            >
              <Box
                sx={{
                  px: { xs: 2, sm: 3 },
                  py: 2,
                  borderBottom: '1px solid #e5e5e5',
                  background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 600, 
                    color: '#1a1a1a',
                    fontSize: { xs: '1rem', sm: '1.125rem' },
                    mb: 0.5
                  }}
                >
                  Notes & Comments
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: '#1976d2',
                    fontSize: { xs: '0.813rem', sm: '0.875rem' },
                    fontWeight: 500
                  }}
                >
                  Your private notes and public comments for this slide.
                </Typography>
              </Box>
              <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
                <CommentNoteToggleView uri={currentSlideUri} defaultPrivate={true} />
              </Box>
            </Paper>
          </Container>
        </Box>
      </LayoutWithFixedMenu>
    </MainLayout>
  );
};

export default CourseViewPage;