import { SafeFTMLDocument, SafeFTMLFragment } from '@alea/stex-react-renderer';
import SearchIcon from '@mui/icons-material/Search';
import { Box, IconButton, InputAdornment, LinearProgress, TextField, Tooltip } from '@mui/material';
import { useRouter } from 'next/router';

import { useEffect, useState } from 'react';
import { searchDocs, type SearchResult, contentToc, TocElem } from '@flexiformal/ftml-backend';
import { getSecInfo } from '../components/coverage-update';
import { getAllCourses, getSlideUriToIndexMapping } from '@alea/spec';
import { getParamFromUri, pathToCourseHome, pathToCourseNotes, pathToCourseView } from '@alea/utils';
import type { CourseInfo } from '@alea/utils';

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

function findParentSlideUri(targetUri: string, toc: TocElem[] | undefined): string | undefined {
  if (!toc) return;

  const targetKey = getParamFromUri(targetUri, 'a') ?? targetUri;

  function walk(nodes: TocElem[]): string | undefined {
    for (const node of nodes) {
      if ('uri' in node && typeof node.uri === 'string') {
        const nodeKey = getParamFromUri(node.uri, 'a') ?? node.uri;

        if (nodeKey === targetKey) {
          return node.uri;
        }
      }

      if ('children' in node && node.children?.length) {
        const found = walk(node.children);
        if (found) return found;
      }
    }
  }

  return walk(toc);
}

function getSectionId(node: TocElem | null | undefined): string | undefined {
  if (!node) return undefined;

  if (node.type === 'Section' || node.type === 'Inputref') {
    return node.id;
  }

  return undefined;
}

const SearchCourseNotes = ({
  courseId,
  notesUri,
  query,
  onClose,
  setHasResults,
  institutionId = 'FAU',
  instance = 'latest',
}: {
  courseId: string;
  notesUri: string;
  query?: string;
  onClose?: any;
  setHasResults?: (val: boolean) => void;
  institutionId?: string;
  instance?: string;
}) => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>(query || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState(false);
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
      setToc(toc);
    });
  }, [notesUri]);

  function getSecIdWrtLoUri(targetUri: string, toc: any) {
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
    const courses = (await getAllCourses()) as Record<string, CourseInfo>;

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
      const mapping = await getSlideUriToIndexMapping(foundCourseId);

      const parentSlideUri = findParentSlideUri(targetUri, courseTocs[foundCourseId]);
      if (!parentSlideUri) {
        router.push(
          `${pathToCourseView(institutionId, foundCourseId, instance)}?fragment=${encodeURIComponent(
            targetUri
          )}`
        );
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
        router.push(
          `${pathToCourseView(institutionId, foundCourseId, instance)}?sectionId=${encodeURIComponent(
            foundSectionId
          )}&slideNum=${encodeURIComponent(String(foundSlideNum))}`
        );
        return;
      }

      router.push(
        `${pathToCourseView(institutionId, foundCourseId, instance)}?fragment=${encodeURIComponent(
          targetUri
        )}`
      );
    } catch (err) {
      console.error('Failed to resolve slide via mapping, falling back to fragment route', err);
      router.push(
        `${pathToCourseView(institutionId, foundCourseId, instance)}?fragment=${encodeURIComponent(
          targetUri
        )}`
      );
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
          p: 1.25,
          maxWidth: 800,
          margin: '0 auto',
          gap: 1.25,
        }}
      >
        <Tooltip title={courseId}>
          <img
            height="60px"
            // src={`\\${courseId}.jpg`}
            src={`/${courseId}.jpg`}
            alt={courseId}
            style={{ borderRadius: '5px', cursor: 'pointer' }}
            onClick={() => router.push(pathToCourseHome(institutionId, courseId, instance))}
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
        <Box bgcolor="white" borderRadius={1} mb={2} p={1.25}>
          <Box maxWidth={800} m="0 auto" p={2.5}>
            {results.map((res, idx) => {
              if (!res || typeof res !== 'object') return null;

              const isLast = idx === results.length - 1;

              if ('Document' in res) {
                const uri = res.Document;

                const result = findParentAcrossCourses(uri, courseTocs);
                const id = getSectionId(result?.parent) ?? '#';

                const foundCourseId = result?.courseId ?? courseId;
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
                            window.location.href = `${pathToCourseNotes(
                              institutionId,
                              foundCourseId,
                              instance
                            )}#${id}`;
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
                          borderTop: '1px solid',
                          borderTopColor: 'primary.900',
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

                const foundCourseId = result?.courseId ?? courseId;

                const id = getSectionId(result?.parent) ?? '#';

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
                            window.location.href = `${pathToCourseNotes(
                              institutionId,
                              foundCourseId,
                              instance
                            )}#${id}`;
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
                          borderTop: '1px solid',
                          borderTopColor: 'primary.900',
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
