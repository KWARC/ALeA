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

  // 🟢 NEW: load TOC ONCE and extract sections
  useEffect(() => {
    if (!notesUri) return;

    contentToc({ uri: notesUri }).then(([, toc] = [[], []]) => {
      console.log({ toc });
      setToc(toc);

      // const sec= getSecInfo(toc)
      // const secs = toc.flatMap((entry) => getSecInfo(entry).map(({ id, uri }) => ({ id, uri })));
      // setSections(secs);
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
  // function getSecIdWrtUri(targetUri: string ) {
  //   console.log({targetUri})
  //   console.log({sections})
  //   const section = sections.find((s) => s.uri === targetUri);
  //   return section ? section.id : null;
  // }

  // 🔴 CHANGED: sync + cached section resolver
  // function resolveSectionFromUri(targetUri: string) {
  //   return sections
  //     .filter((s) => targetUri.startsWith(s.uri))
  //     .sort((a, b) => b.uri.length - a.uri.length)[0];
  // }

  // useEffect(() => {
  //   if (!searchQuery.trim() || !notesUri) return;
  //   handleSearch();
  // }, [searchQuery, notesUri]);
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

  // async function resolveSectionFromUri(targetUri: string) {
  //   const toc = (await contentToc({ uri: notesUri }))?.[1] ?? [];

  //   const sections = toc.flatMap((entry) => getSecInfo(entry).map(({ id, uri }) => ({ id, uri })));

  //   return sections
  //     .filter((s) => targetUri.startsWith(s.uri))
  //     .sort((a, b) => b.uri.length - a.uri.length)[0];
  // }

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

                // const id = getSecIdWrtLoUri(uri, toc);
                // console.log('avhi2', id);
                const result = findParentAcrossCourses(uri, courseTocs);
                                const id = result?.parent.id??"#";

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
                        {/* <IconButton
                          size="small"
                          onClick={async () => {
                            const section = await resolveSectionFromUri(uri);
                            if (!section) return;

                            // const hash = sectionUriToHash(section.uri);
                            // if (!hash) return;

                            // router.push(
                            //   `/course-notes/${courseId}#section/${section.id}`
                            // );

                            // window.location.href = `/course-notes/${courseId}#${section.id}`;
                            window.location.href = `/course-notes/${courseId}#${encodeURIComponent(
                              uri
                            )}`;
                          }}
                        >
                          Notes
                        </IconButton> */}

                        <IconButton
                          size="small"
                          // onClick={async () => {
                          //   window.location.href = `/course-notes/${courseId}#${encodeURIComponent(
                          //     uri
                          //   )}`;
                          // }}

                          onClick={async () => {
                            window.location.href = `/course-notes/${foundCourseId}#${id}`;
                          }}
                        >
                          Notes
                        </IconButton>

                        <IconButton
                          size="small"
                          onClick={() =>
                            router.push(
                              `/course-view/${courseId}?fragment=${encodeURIComponent(uri)}`
                            )
                          }
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

                // const id = getSecIdWrtLoUri(uri, toc);
                const id = result?.parent?.id??"#";
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
                        {/* <IconButton
                          size="small"
                          onClick={async () => {
                           const section = await resolveSectionFromUri(uri);
                            if (!section) return;

                            // const hash = sectionUriToHash(section.uri);
                            // if (!hash) return;

                            // router.push(
                            //   `/course-notes/${courseId}#section/${section.id}`
                            // );

                            // window.location.href = `/course-notes/${courseId}#${section.id}`;
                            window.location.href = `/course-notes/${courseId}#${encodeURIComponent(uri)}`;
                          }}
                        >
                          Notes
                        </IconButton> */}

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
                          onClick={() =>
                            router.push(
                              `/course-view/${courseId}?fragment=${encodeURIComponent(uri)}`
                            )
                          }
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
