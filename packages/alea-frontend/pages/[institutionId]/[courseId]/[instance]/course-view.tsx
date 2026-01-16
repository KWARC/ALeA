import { SafeFTMLFragment } from '@alea/stex-react-renderer';
import { contentToc } from '@flexiformal/ftml-backend';
import { FTML, injectCss } from '@flexiformal/ftml';
import { VideoCameraBack } from '@mui/icons-material';
import ArticleIcon from '@mui/icons-material/Article';
import { Box, Button, CircularProgress, Typography, Container, Paper, Stack } from '@mui/material';
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
import { ContentDashboard, LayoutWithFixedMenu, SectionReview } from '@alea/stex-react-renderer';
import { Action, CourseInfo, localStore, ResourceName, shouldUseDrawer } from '@alea/utils';
import axios from 'axios';
import { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import QuizComponent from '../../../../components/GenerateQuiz';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { getSlideUri, SlideDeck } from '../../../../components/SlideDeck';
import { VideoDisplay, SlidesUriToIndexMap } from '../../../../components/VideoDisplay';
import { getLocaleObject } from '../../../../lang/utils';
import MainLayout from '../../../../layouts/MainLayout';
import CourseViewToolbarIcons from '../../../../components/course-view/CourseViewToolbarIcons';
import NotesAndCommentsSection from '../../../../components/course-view/NotesAndCommentsSection';
import { SlidesClipInfo } from '@alea/spec';
import { ViewMode, setSlideNumAndSectionId } from '../../../../utils/courseViewUtils';
import { useRouteValidation } from '../../../../hooks/useRouteValidation';
import { RouteErrorDisplay } from '../../../../components/RouteErrorDisplay';
import { CourseNotFound } from '../../../../components/CourseNotFound';

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

function populateSlidesClipInfos(sections: SectionInfo[], slidesClipInfo: SlidesClipInfo) {
  for (const section of sections) {
    slidesClipInfo[section.id] = section.clipInfo;
    populateSlidesClipInfos(section.children, slidesClipInfo);
  }
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
  const {
    institutionId,
    courseId,
    instance,
    resolvedInstanceId,
    courses: coursesFromHook,
    validationError,
    isValidating,
    loadingInstanceId,
  } = useRouteValidation('course-view');

  const sectionId = router.query.sectionId as string;
  const slideNum = +((router.query.slideNum as string) || 0);
  const viewModeStr = router.query.viewMode as string;
  const viewMode = ViewMode[viewModeStr as keyof typeof ViewMode];
  const isVideoVisible = viewMode === ViewMode.COMBINED_MODE;
  const audioOnlyStr = router.query.audioOnly as string;
  const audioOnly = audioOnlyStr === 'true';
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
  const courses = coursesFromHook;
  const [timestampSec, setTimestampSec] = useState(0);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [hasPresentationOrComposite, setHasPresentationOrComposite] = useState(false);
  const [toc, setToc] = useState<FTML.TocElem[]>([]);
  const [currentSlideUri, setCurrentSlideUri] = useState<string>('');
  const [isQuizMaker, setIsQUizMaker] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const handleSearchClick = () => setDialogOpen(true);
  const handleDialogClose = () => setDialogOpen(false);
  const [resolution, setResolution] = useState(720);
  const [videoMode, setVideoMode] = useState<'presenter' | 'presentation' | null>(() => {
    const saved = localStore?.getItem('videoMode');
    if (saved === 'presenter' || saved === 'presentation') return saved;
    return null;
  });
  const [showPresentationVideo, setShowPresentationVideo] = useState(false);
  const [hasSlideAtCurrentTime, setHasSlideAtCurrentTime] = useState(true);
  const selectedSectionTOC = useMemo(() => {
    return findSection(toc, sectionId);
  }, [toc, sectionId]);

  const handleVideoLoad = (status) => {
    setVideoLoaded(status);
  };
  const sectionSlidesMap = useMemo(() => {
    if (!videoExtractedData) return {};
    const result: Record<string, boolean> = {};
    for (const [, item] of Object.entries(videoExtractedData)) {
      const secId = (item.sectionId as string) || '';
      const slideUri = (item.slideUri as string) || '';
      if (!secId || !slideUri.trim()) continue;
      result[secId] = true;
    }
    return result;
  }, [videoExtractedData]);
  const sectionSlides = slidesUriToIndexMap?.[sectionId] ?? {};

  const hasSlidesFromMapping = Object.keys(sectionSlides ?? {}).length > 0;

  const hasSlidesFromVideoMarkers = useMemo(() => {
    if (!videoExtractedData || !sectionId) return false;

    return Object.values(videoExtractedData).some(
      (item: any) =>
        (item.sectionId || '').trim() === sectionId && (item.slideUri || '').trim() !== ''
    );
  }, [videoExtractedData, sectionId]);

  const sectionContainSlides = hasSlidesFromMapping || hasSlidesFromVideoMarkers;

  const hasVideoForSection = !!currentClipId && !!clipIds?.[sectionId];

  const showSideBySideSlides =
    viewMode === ViewMode.COMBINED_MODE &&
    sectionContainSlides &&
    videoLoaded &&
    hasSlideAtCurrentTime;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditableTarget =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          (target as HTMLElement).isContentEditable);
      if (isEditableTarget) return;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setDialogOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (!courseId || !resolvedInstanceId) return;
    const checkAccess = async () => {
      const hasAccess = await canAccessResource(ResourceName.COURSE_QUIZ, Action.MUTATE, {
        courseId,
        instanceId: resolvedInstanceId,
      });
      setIsQUizMaker(hasAccess);
    };
    checkAccess();
  }, [courseId, resolvedInstanceId]);

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
    if (!router.isReady || !sectionId || !clipIds || Object.keys(clipIds).length === 0) return;
    const newClipId = clipIds[sectionId];
    if (!newClipId) {
      if (currentClipId) {
        setCurrentClipId('');
        setVideoLoaded(false);
        setVideoExtractedData({});
        setTimestampSec(0);
      }
      return;
    }

    if (!currentClipId) {
      setCurrentClipId(newClipId);
      return;
    }

    const sectionExistsInCurrentClip =
      slidesClipInfo?.[sectionId] &&
      Object.values(slidesClipInfo[sectionId] || {}).some(
        (clips: ClipInfo[]) =>
          Array.isArray(clips) && clips.some((clip) => clip.video_id === currentClipId)
      );
    if (newClipId !== currentClipId && !sectionExistsInCurrentClip) {
      setCurrentClipId(newClipId);
      setVideoLoaded(false);
      setTimestampSec(0);
    }
  }, [router.isReady, sectionId, clipIds, currentClipId, slidesClipInfo]);

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
    const newQuery = { ...query };
    let someParamMissing = false;
    
    if (!sectionId) {
      someParamMissing = true;
      const inStore = localStore?.getItem(`lastReadSectionId-${courseId}`);
      if (inStore?.length) {
        newQuery.sectionId = inStore;
      } else {
        const firstSection = Object.keys(slideCounts)?.[0];
        if (firstSection) newQuery.sectionId = firstSection;
      }
    }
    if (!slideNum) {
      someParamMissing = true;
      newQuery.slideNum = localStore?.getItem(`lastReadSlideNum-${courseId}`) || '1';
    }
    if (!viewMode) {
      someParamMissing = true;
      newQuery.viewMode = localStore?.getItem('defaultMode') || ViewMode.COMBINED_MODE.toString();
    }
    if (!audioOnlyStr) {
      someParamMissing = true;
      newQuery.audioOnly = localStore?.getItem('audioOnly') || 'false';
    }
    if (someParamMissing) {
      router.replace({ pathname, query: newQuery }, undefined, { shallow: true });
    }
  }, [router.isReady, sectionId, slideNum, viewMode, courseId, audioOnlyStr, slideCounts, router.pathname]);

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

  if (isValidating || loadingInstanceId || !courses) {
    return (
      <MainLayout title="Loading... | ALeA">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (validationError) {
    return (
      <RouteErrorDisplay
        validationError={validationError}
        institutionId={institutionId}
        courseId={courseId}
        instance={instance}
      />
    );
  }

  if (!courses[courseId] || !resolvedInstanceId) {
    return <CourseNotFound bgColor={undefined} />;
  }

  const onClipChange = (clip: any) => {
    setCurrentClipId(clip.video_id);
    setTimestampSec(clip.start_time);
  };

  const hasSlidesForSection =
    (sectionSlides && Object.keys(sectionSlides).length > 0) || !!sectionSlidesMap[sectionId];
  const onSlideChange = (slide: Slide) => {
    setPreNotes(slide?.preNotes.map((p) => p.html) || []);
    setPostNotes(slide?.postNotes.map((p) => p.html) || []);

    const slideUri = getSlideUri(slide);
    setCurrentSlideUri(slideUri || '');

    if (slidesClipInfo?.[sectionId]?.[slideUri]) {
      const slideClips = slidesClipInfo[sectionId][slideUri];
      const matchedClip = slideClips.find((c) => c.video_id === currentClipId) || slideClips[0];
      setCurrentSlideClipInfo(matchedClip);
    } else {
      setCurrentSlideClipInfo(null);
    }
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
                const newClipId = clipIds?.[sectionId];
                if (newClipId) {
                  setCurrentClipId(newClipId);
                } else {
                  setCurrentClipId('');
                  setVideoLoaded(false);
                  setVideoExtractedData({});
                  setTimestampSec(0);
                }
                const sectionSlides = slidesUriToIndexMap?.[sectionId];
                if (sectionSlides && Object.keys(sectionSlides).length > 0) {
                  const firstSlideUri =
                    Object.keys(sectionSlides).find((slideUri) => sectionSlides[slideUri] === 0) ||
                    Object.keys(sectionSlides)[0];

                  if (firstSlideUri && slidesClipInfo?.[sectionId]?.[firstSlideUri]) {
                    const slideClips = slidesClipInfo[sectionId][firstSlideUri];
                    if (Array.isArray(slideClips) && slideClips.length > 0) {
                      const matchedClip = newClipId
                        ? slideClips.find((clip) => clip.video_id === newClipId)
                        : null;
                      const clipToUse = matchedClip || slideClips[0];
                      if (clipToUse.start_time !== undefined) {
                        setTimestampSec(clipToUse.start_time);
                      }
                      setCurrentSlideClipInfo(clipToUse);
                    }
                  }
                }

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
              px: { xs: 0.5, sm: 1 },
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: { xs: 2, sm: 3 },
                borderRadius: 2,
                bgcolor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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
                    gap: 1,
                  }}
                >
                  <ToggleModeButton
                    viewMode={viewMode}
                    updateViewMode={(mode) => {
                      const modeStr = mode.toString();
                      localStore?.setItem('defaultMode', modeStr);
                      // FIX: Changed from router.replace(router) to explicit pathname/query to prevent infinite loops
                      // Using shallow routing to avoid full page reload
                      router.replace({ pathname: router.pathname, query: { ...router.query, viewMode: modeStr } }, undefined, { shallow: true });
                    }}
                  />
                  <CourseViewToolbarIcons
                    audioOnly={audioOnly}
                    resolution={resolution}
                    courseId={courseId}
                    courses={courses}
                    viewMode={viewMode}
                    onAudioOnlyToggle={() => {
                      const newAudioOnly = !audioOnly;
                      localStore?.setItem('audioOnly', String(newAudioOnly));
                      // FIX: Changed from router.replace(router) to explicit pathname/query to prevent infinite loops
                      // Using shallow routing to avoid full page reload
                      router.replace({ pathname: router.pathname, query: { ...router.query, audioOnly: String(newAudioOnly) } }, undefined, { shallow: true });
                    }}
                    onResolutionChange={(res) => setResolution(res)}
                  />
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
                      },
                    }}
                  >
                    {t.notes}
                  </Button>
                </Link>
              </Stack>
            </Paper>
            <Stack
              direction={{
                xs: 'column',
                lg: viewMode === ViewMode.COMBINED_MODE ? 'row' : 'column',
              }}
              spacing={{ xs: 2, sm: 3 }}
              sx={{ mb: { xs: 2, sm: 3 } }}
            >
              {viewMode === ViewMode.COMBINED_MODE && (
                <Box
                  sx={{
                    flex:
                      showPresentationVideo || hasPresentationOrComposite
                        ? '1 1 100%'
                        : { xs: '1', lg: '1 1 50%' },
                    minWidth: 0,
                  }}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: '#f5f5f5',
                      border: '1px solid #e0e0e0',
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
                      onVideoTypeChange={setHasPresentationOrComposite}
                      videoMode={videoMode}
                      currentSectionId={sectionId}
                      currentSlideUri={currentSlideUri}
                      courseId={courseId}
                      slidesClipInfo={slidesClipInfo}
                      showPresentationVideo={showPresentationVideo}
                      onPresentationVideoToggle={() => setShowPresentationVideo((prev) => !prev)}
                      sectionTitle={selectedSectionTOC?.title || ''}
                      hasSlidesForSection={hasSlidesForSection}
                      onHasSlideAtCurrentTimeChange={setHasSlideAtCurrentTime}
                      videoLoaded={videoLoaded}
                      resolution={resolution}
                    />
                  </Paper>
                </Box>
              )}
              {showSideBySideSlides && (
                <Box
                  sx={{
                    position: 'relative',
                    flex:
                      showPresentationVideo || hasPresentationOrComposite
                        ? '0'
                        : { xs: '1', lg: '1 1 50%' },
                    minWidth: 0,
                    display: showPresentationVideo || hasPresentationOrComposite ? 'none' : 'block',
                  }}
                >
                  <Paper
                    elevation={2}
                    sx={{
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'white',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <SlideDeck
                      navOnTop={viewMode === ViewMode.COMBINED_MODE}
                      courseId={courseId}
                      sectionId={sectionId}
                      onSlideChange={onSlideChange}
                      goToNextSection={goToNextSection}
                      goToPrevSection={goToPrevSection}
                      slideNum={slideNum}
                      slidesClipInfo={slidesClipInfo}
                      onClipChange={onClipChange}
                      audioOnly={audioOnly}
                      videoLoaded={videoLoaded}
                      showPresentationVideo={showPresentationVideo}
                      hasSlideAtCurrentTime={hasSlideAtCurrentTime}
                      onPresentationVideoToggle={() => setShowPresentationVideo((prev) => !prev)}
                    />
                  </Paper>
                </Box>
              )}
            </Stack>
            {sectionContainSlides && !(isVideoVisible && videoLoaded && hasVideoForSection) && (
              <Box sx={{ mt: { xs: 2, sm: 3 } }}>
                <Paper
                  elevation={2}
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'white',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  <SlideDeck
                    navOnTop
                    courseId={courseId}
                    sectionId={sectionId}
                    onSlideChange={onSlideChange}
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
            )}

            {(preNotes.length > 0 || postNotes.length > 0) && (
              <Paper
                elevation={1}
                sx={{
                  p: { xs: 2, sm: 3 },
                  mb: { xs: 2, sm: 3 },
                  borderRadius: 2,
                  bgcolor: '#fff9e6',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: '1px solid #ffeaa7',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: '#1a1a1a',
                      fontSize: { xs: '1rem', sm: '1.125rem' },
                    }}
                  >
                    {t.instructorNotes}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    overflowX: 'auto',
                    '& > *': { mb: 1.5 },
                  }}
                >
                  <RenderElements elements={preNotes} />
                  {preNotes.length > 0 && postNotes.length > 0 && (
                    <Box
                      sx={{
                        my: 2,
                        borderTop: '2px dashed #fdcb6e',
                      }}
                    />
                  )}
                  <RenderElements elements={postNotes} />
                </Box>
              </Paper>
            )}
            {selectedSectionTOC && (
              <Stack spacing={{ xs: 2, sm: 3 }}>
                <SectionReview
                  sectionUri={selectedSectionTOC.uri}
                  sectionTitle={selectedSectionTOC.title}
                />
                {isQuizMaker && (
                  <QuizComponent key={sectionId} courseId={courseId} sectionId={sectionId} />
                )}
              </Stack>
            )}
            <NotesAndCommentsSection currentSlideUri={currentSlideUri} />
          </Container>
        </Box>
      </LayoutWithFixedMenu>
    </MainLayout>
  );
};

export default CourseViewPage;
