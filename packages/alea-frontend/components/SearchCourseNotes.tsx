import { SafeFTMLDocument, SafeFTMLFragment } from '@alea/stex-react-renderer';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, InputAdornment, LinearProgress, TextField, Tooltip } from '@mui/material';
import { useRouter } from 'next/router';

import { useEffect, useState } from 'react';
import { searchDocs, type SearchResult, contentToc, TocElem } from '@flexiformal/ftml-backend';
import { getSecInfo } from '../components/coverage-update';
import { getAllCourses } from '@alea/spec';
function findImmediateParentSection(
  targetUri: string,
  toc: TocElem[] | undefined,
  parent: TocElem | null = null
): TocElem | null {
  if (!toc) return null;

  for (const node of toc) {
    if ('uri' in node && node.uri === targetUri) {
      return parent;
    }
    if ('children' in node && node.children?.length) {
      const found = findImmediateParentSection(targetUri, node.children, node);

      if (found) return found;
    }
  }

  return null;
}

function extractAParam(uri: string): string {
  const match = uri.match(/[?&]a=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : uri;
}

function findParentSlideUri(targetUri: string, toc: TocElem[] | undefined): string | undefined {
  const normalizedTarget = extractAParam(targetUri);

  let foundSlideUri: string | undefined;

  function recurse(nodes: TocElem[]): boolean {
    for (const node of nodes) {
      if (node.type === 'Slide' && typeof node.uri === 'string') {
        if (normalizedTarget.includes(node.uri)) {
          foundSlideUri = node.uri;
        }
      }
      if ('children' in node && node.children?.length) {
        if (recurse(node.children)) return true;
      }
    }
    return false;
  }
  if (toc) recurse(toc);
  return foundSlideUri;
}

const SearchCourseNotes = ({
  courseId,
  notesUri,
  query,
  onClose,
  setHasResults,
}: {
  courseId: string;
  notesUri: string;
  query?: string;
  onClose?: any;
  setHasResults?: (val: boolean) => void;
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>(query || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState(false);
  console.log({ notesUri });
  const [sections, setSections] = useState<{ id: string; uri: string }[]>([]);
  const [toc, setToc] = useState<any>([]);

  useEffect(() => {
    if (query) {
      setSearchQuery(query);
    }
  }, [query]);

  useEffect(() => {
    if (!notesUri) return;

    contentToc({ uri: notesUri }).then(([, toc] = [[], []]) => {
      console.log({ toc });
      setToc(toc);
    });
  }, [notesUri]);

  function getSecIdWrtLoUri(targetUri: string, toc: any) {
    console.log({ targetUri });
    console.log({ sections });
    if (toc?.uri === targetUri) return toc.id;
    if (!toc?.children?.length) return;
    const children = toc?.children;
    getSecIdWrtLoUri(targetUri, children);
  }

  type CourseTocMap = Record<string, TocElem[]>;

  const [courseTocs, setCourseTocs] = useState<CourseTocMap>({});
  useEffect(() => {
    const init = async () => {
      const tocMap = await buildCourseTocMap();
      setCourseTocs(tocMap);
    };

    init();
  }, []);
  const buildCourseTocMap = async (): Promise<CourseTocMap> => {
    const courses = await getAllCourses();

    const entries = await Promise.all(
      Object.entries(courses ?? {}).map(async ([courseId, courseInfo]) => {
        if (!courseInfo?.notes) {
          return [courseId, [] as TocElem[]];
        }

        try {
          const [, toc] = (await contentToc({ uri: courseInfo.notes })) ?? [];
          return [courseId, toc ?? []];
        } catch (err) {
          console.error(`Failed to load TOC for course ${courseId}`, err);
          return [courseId, [] as TocElem[]];
        }
      })
    );

    return Object.fromEntries(entries);
  };
  const findParentAcrossCourses = (targetUri: string, courseTocs: CourseTocMap) => {
    for (const [courseId, toc] of Object.entries(courseTocs)) {
      const parent = findImmediateParentSection(targetUri, toc);
      if (parent) {
        return { courseId, parent };
      }
    }
    return null;
  };

  useEffect(() => {
    if (query && notesUri) {
      handleSearch();
    }
  }, [query, notesUri]);

  if (!notesUri) {
    return null;
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !notesUri) return;

    setIsLoading(true);
    setHasSearched(true);
    try {
      const res: [number, SearchResult][] = await searchDocs(searchQuery, [notesUri], 15);
      console.log({ res });

      const normalized = (res ?? []).map(([, r]) => r);
      setResults(normalized);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function navigateToSlideFromUri(foundCourseId: string, targetUri: string) {
    try {
      const mapRes = await fetch(
        `/api/get-slide-uri-to-index-mapping?courseId=${encodeURIComponent(foundCourseId)}`
      );
      if (!mapRes.ok) throw new Error('mapping fetch failed');
      const mapping = (await mapRes.json()) as Record<string, Record<string, number>>;

      const parentSlideUri = findParentSlideUri(targetUri, courseTocs[foundCourseId]);

      console.log('targetUri:', targetUri);
      console.log('normalizedTarget:', extractAParam(targetUri));
      console.log('parentSlideUri:', parentSlideUri);
      console.log(
        'All mapping keys:',
        Object.values(mapping).flatMap((slideMap) => Object.keys(slideMap))
      );

      if (!parentSlideUri) {
        router.push(`/course-view/${foundCourseId}?fragment=${encodeURIComponent(targetUri)}`);
        return;
      }

      let foundSectionId: string | undefined;
      let foundSlideNum: number | undefined;
      for (const [sectionId, slideMap] of Object.entries(mapping)) {
        if (slideMap && Object.prototype.hasOwnProperty.call(slideMap, parentSlideUri)) {
          foundSectionId = sectionId;
          foundSlideNum = slideMap[parentSlideUri] + 1;
          break;
        }
      }

      if (foundSectionId && foundSlideNum !== undefined) {
        console.log('Navigating to:', {
          foundCourseId,
          foundSectionId,
          foundSlideNum,
          parentSlideUri,
          mapping,
        });

        router.push(
          `/course-view/${foundCourseId}?sectionId=${encodeURIComponent(
            foundSectionId
          )}&slideNum=${encodeURIComponent(String(foundSlideNum))}`
        );
        return;
      }

      router.push(`/course-view/${foundCourseId}?fragment=${encodeURIComponent(targetUri)}`);
    } catch (err) {
      console.error('Failed to resolve slide via mapping, falling back to fragment route', err);
      router.push(`/course-view/${foundCourseId}?fragment=${encodeURIComponent(targetUri)}`);
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  if (isLoading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '10px',
          maxWidth: '800px',
          margin: '0 auto',
          gap: '10px',
        }}
      >
        <Tooltip title={courseId}>
          <img
            height="60px"
            // src={`\\${courseId}.jpg`}
            src={`/${courseId}.jpg`}
            alt={courseId}
            style={{ borderRadius: '5px', cursor: 'pointer' }}
            onClick={() => router.push(`/course-home/${courseId}`)}
          />
        </Tooltip>
        <TextField
          fullWidth
          variant="outlined"
          value={searchQuery}
          placeholder={`Search in ${courseId.toUpperCase() || 'the'} notes`}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleSearch}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          onKeyDown={handleKeyDown}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </Box>

      {hasSearched && results.length === 0 && (
        <Box textAlign="center" mt={4} color="text.secondary">
          No results found
        </Box>
      )}

      {results.length > 0 && (
        <Box bgcolor="white" borderRadius="5px" mb="15px" p="10px">
          <Box maxWidth="800px" m="0 auto" p="10px">
            {results.map((res, idx) => {
              if (!res || typeof res !== 'object') return null;

              const isLast = idx === results.length - 1;

              if ('Document' in res) {
                const uri = res.Document;

                const result = findParentAcrossCourses(uri, courseTocs);
                const id = result?.parent.id ?? '#';

                if (result) {
                  console.log('Found in course:', result.courseId);
                  console.log('Parent section:', result.parent);
                }
                const foundCourseId = result?.courseId ?? courseId;
                console.log({ uri, id });
                return (
                  <Box key={idx} mb={2}>
                    <Box display="flex" gap={2}>
                      <Box flex={1}>
                        <SafeFTMLDocument
                          document={{ type: 'FromBackend', uri }}
                          showContent={false}
                          pdfLink={false}
                          chooseHighlightStyle={false}
                          allowFullscreen={false}
                          toc="None"
                        />
                      </Box>

                      <Box display="flex" flexDirection="column" gap={1}>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            window.location.href = `/course-notes/${foundCourseId}#${id}`;
                          }}
                        >
                          Notes
                        </IconButton>

                        <IconButton
                          size="small"
                          onClick={() => {
                            onClose?.();

                            navigateToSlideFromUri(foundCourseId, uri);
                          }}
                        >
                          Slides
                        </IconButton>
                      </Box>
                    </Box>

                    {!isLast && (
                      <Box
                        component="hr"
                        sx={{
                          border: 0,
                          borderTop: '1px solid #000',
                          mt: 2,
                        }}
                      />
                    )}
                  </Box>
                );
              }

              if ('Paragraph' in res) {
                const uri = res.Paragraph.uri;
                const result = findParentAcrossCourses(uri, courseTocs);

                if (result) {
                  console.log('Found in course:', result.courseId);
                  console.log('Parent section:', result.parent);
                }
                const foundCourseId = result?.courseId ?? courseId;

                const id = result?.parent?.id ?? '#';
                console.log('avhi', id);
                console.log({ uri, id });
                return (
                  <Box key={idx} mb={2}>
                    <Box display="flex" gap={2}>
                      <Box flex={1}>
                        <SafeFTMLFragment
                          fragment={{ type: 'FromBackend', uri }}
                          allowFullscreen={false}
                        />
                      </Box>

                      <Box display="flex" flexDirection="column" gap={1}>
                        <IconButton
                          size="small"
                          onClick={async () => {
                            window.location.href = `/course-notes/${foundCourseId}#${id}`;
                          }}
                        >
                          Notes
                        </IconButton>

                        <IconButton
                          size="small"
                          onClick={() => {
                            onClose?.();
                            navigateToSlideFromUri(foundCourseId, uri);
                          }}
                        >
                          Slides
                        </IconButton>
                      </Box>
                    </Box>

                    {!isLast && (
                      <Box
                        component="hr"
                        sx={{
                          border: 0,
                          borderTop: '1px solid #000',
                          mt: 2,
                        }}
                      />
                    )}
                  </Box>
                );
              }

              return null;
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SearchCourseNotes;
