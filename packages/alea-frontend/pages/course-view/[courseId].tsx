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
  SlidesClipInfo,
} from '@alea/spec';
import { CommentNoteToggleView } from '@alea/comments';
import { SafeHtml } from '@alea/react-utils';
import {
  ContentDashboard,
  LayoutWithFixedMenu,
  NOT_COVERED_SECTIONS,
  SafeFTMLFragment,
  SectionReview,
} from '@alea/stex-react-renderer';
import {
  Action,
  CourseInfo,
  getCoursePdfUrl,
  getParamFromUri,
  localStore,
  ResourceName,
  shouldUseDrawer,
} from '@alea/utils';

import { FTML, injectCss } from '@flexiformal/ftml';
import { contentToc } from '@flexiformal/ftml-backend';
import { VideoCameraBack } from '@mui/icons-material';
import ArticleIcon from '@mui/icons-material/Article';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import shadows from '../../theme/shadows';
import axios from 'axios';
import { NextPage } from 'next';
import Link from 'next/link';
import { NextRouter, useRouter } from 'next/router';
import { Fragment, useEffect, useMemo, useState } from 'react';
import CourseViewToolbarIcons from '../../components/course-view/CourseViewToolbarIcons';
import NotesAndCommentsSection from '../../components/course-view/NotesAndCommentsSection';
import QuizComponent from '../../components/GenerateQuiz';
import { getSlideUri, SlideDeck } from '../../components/SlideDeck';
import { SlidesUriToIndexMap, VideoDisplay } from '../../components/VideoDisplay';
import { useCurrentTermContext } from '../../contexts/CurrentTermContext';
import { getLocaleObject } from '../../lang/utils';
import MainLayout from '../../layouts/MainLayout';
import { SearchDialog } from '../course-notes/[courseId]';
import SearchIcon from '@mui/icons-material/Search';
// DM: if possible, this should use the *actual* uri; uri:undefined should be avoided
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
        fontSize: { xs: 12, sm: 14 },
        whiteSpace: 'nowrap',
        minWidth: { xs: 'auto', sm: 140 },
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
  courseId: string,
  sectionId: string,
  isParentNotCovered = false
): { tocElem: Extract<FTML.TocElem, { type: 'Section' }>; isNotCovered: boolean } {
  for (const tocElem of toc) {
    const isNotCovered =
      isParentNotCovered ||
      (tocElem.type === 'Section' && NOT_COVERED_SECTIONS[courseId]?.includes(tocElem.uri));
    if (tocElem.type === 'Section' && tocElem.id === sectionId) {
      return { tocElem, isNotCovered };
    } else if ('children' in tocElem) {
      const result = findSection(tocElem.children, courseId, sectionId, isNotCovered);
      if (result.tocElem) return result;
    }
  }
  return { tocElem: undefined, isNotCovered: false };
}

function resolveSlideFromFragment(
  fragment: string,
  slidesUriToIndexMap: SlidesUriToIndexMap
): { sectionId: string; slideNum: number } | null {
  const decoded = decodeURIComponent(fragment);
  const normalizedFragment = getParamFromUri(decoded, 'a') || decoded;

  let bestMatch: { sectionId: string; slideUri: string; slideIndex: number } | null = null;

  for (const [sectionId, slideMap] of Object.entries(slidesUriToIndexMap)) {
    if (!slideMap) continue;
    for (const [slideUri, slideIndex] of Object.entries(slideMap)) {
      if (
        normalizedFragment.startsWith(slideUri) ||
        slideUri.startsWith(normalizedFragment) ||
        normalizedFragment.includes(slideUri) ||
        slideUri.includes(normalizedFragment)
      ) {
        if (!bestMatch || slideUri.length > bestMatch.slideUri.length) {
          bestMatch = { sectionId, slideUri, slideIndex };
        }
      }
    }
  }

  if (bestMatch) {
    return {
      sectionId: bestMatch.sectionId,
      slideNum: bestMatch.slideIndex + 1,
    };
  }

  return null;
}

const CourseViewPage: NextPage = () => {
  const router = useRouter();
  const courseId = router.query.courseId as string;
  const sectionId = router.query.sectionId as string;
  const slideNum = +((router.query.slideNum as string) || 0);
  const viewModeStr = router.query.viewMode as string;
  const viewMode = ViewMode[viewModeStr as keyof typeof ViewMode];
  const isVideoVisible = viewMode === ViewMode.COMBINED_MODE;
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
  const { tocElem: selectedSectionTOC, isNotCovered: sectionIsNotCovered } = useMemo(() => {
    return findSection(toc, courseId, sectionId);
  }, [toc, courseId, sectionId]);

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
    getSlideUriToIndexMapping(courseId).then((map) => {
      setSlidesUriToIndexMap(map);
    });
  }, [router.isReady, courses, courseId]);

  useEffect(() => {
    if (!router.isReady) return;

    const fragmentParam = router.query.fragment;
    if (!fragmentParam || typeof fragmentParam !== 'string') return;

    if (!Object.keys(slidesUriToIndexMap).length) return;

    const fragment = decodeURIComponent(fragmentParam);

    const resolved = resolveSlideFromFragment(fragment, slidesUriToIndexMap);

    if (!resolved) {
      console.warn('No slide resolved for fragment', fragment);
      return;
    }

    const currentSection = router.query.sectionId as string | undefined;
    const currentSlideNum = Number(router.query.slideNum);

    if (currentSection === resolved.sectionId && currentSlideNum === resolved.slideNum) {
      return;
    }

    const { fragment: _ignored, ...restQuery } = router.query;

    router.replace(
      {
        pathname: router.pathname,
        query: {
          ...restQuery,
          sectionId: resolved.sectionId,
          slideNum: String(resolved.slideNum),
        },
      },
      undefined,
      { shallow: true }
    );
  }, [router.isReady, router.query.fragment, slidesUriToIndexMap]);

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

    if (router.query.fragment) return;

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
  }, [
    router,
    router.isReady,
    router.query.fragment,
    sectionId,
    slideNum,
    viewMode,
    courseId,
    audioOnlyStr,
    slideCounts,
  ]);

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
  const notes = courses?.[courseId]?.notes;

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
      <Tooltip title="Search (Ctrl+Shift+F)" placement="left-start">
        <IconButton
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 64,
            right: 24,
            zIndex: 2002,
            bgcolor: 'primary.50',
            boxShadow: 3,
            '&:hover': {
              bgcolor: 'primary.300',
            },
          }}
          onClick={handleSearchClick}
          size="large"
          aria-label="Open search dialog"
        >
          <SearchIcon fontSize="large" sx={{ opacity: 0.5 }} />
        </IconButton>
      </Tooltip>
      <SearchDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        courseId={courseId}
        notesUri={notes}
        hasResults={hasResults}
        setHasResults={setHasResults}
      />
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
        <Box sx={{ minHeight: '100vh',bgcolor:'background.default' }}>
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
                bgcolor: 'background.paper',
                boxShadow: shadows[2],
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
                      router.query.viewMode = modeStr;
                      router.replace(router);
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
                      router.query.audioOnly = String(newAudioOnly);
                      router.replace(router);
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
                      bgcolor: 'blue.sky',
                      '&:hover': {
                        bgcolor: 'blue.sky',
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
                      bgcolor: 'background.paper',
                      border: '1px solid ',
                      borderColor: 'divider',
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
                      bgcolor: 'background.paper',
                      border: '1px solid ',
                      borderColor: 'divider',
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
                      isNotCovered={sectionIsNotCovered}
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
                    bgcolor: 'background.paper',
                    border: '1px solid ',
                    borderColor: 'divider',
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
                    isNotCovered={sectionIsNotCovered}
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
                  bgcolor: 'warning.50',
                  boxShadow: shadows[2],
                  border: '1px solid ',
                  borderColor: 'divider',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
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
                        borderTop: '2px dashed ',
                        borderColor: 'warning.500',
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
