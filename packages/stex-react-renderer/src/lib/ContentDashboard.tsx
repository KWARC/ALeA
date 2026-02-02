import { getCoverageTimeline } from '@alea/spec';
import { convertHtmlStringToPlain, LectureEntry } from '@alea/utils';
import { FTML } from '@flexiformal/ftml';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import CloseIcon from '@mui/icons-material/Close';
import IndeterminateCheckBoxOutlinedIcon from '@mui/icons-material/IndeterminateCheckBoxOutlined';
import UnfoldLessDoubleIcon from '@mui/icons-material/UnfoldLessDouble';
import UnfoldMoreDoubleIcon from '@mui/icons-material/UnfoldMoreDouble';
import { Box, IconButton, TextField, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import React, { useEffect, useMemo, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { FixedPositionMenu } from './LayoutWithFixedMenu';
import styles from './stex-react-renderer.module.scss';

interface SectionTreeNode {
  parentNode?: SectionTreeNode;
  children: SectionTreeNode[];
  tocElem: Extract<FTML.TocElem, { type: 'Section' }>;
  isCovered?: boolean;
  lectureIdx?: number;
  started?: Date;
  ended?: Date;
  notCovered?: boolean;
}

export const NOT_COVERED_SECTIONS: Record<string, string[]> = {
  lbs: [
    'http://mathhub.info?a=courses/FAU/LBS/course&p=nlfrags/sec&d=frag4-qsa&l=en&e=section',
    //'http://mathhub.info?a=courses/FAU/LBS/course&p=nlfrags/sec&d=frag4-inference&l=en&e=section',
    'http://mathhub.info?a=courses/FAU/LBS/course&p=tense/sec&d=tense&l=en&e=section',
    'http://mathhub.info?a=courses/Jacobs/ComSem&p=nlfrags/sec&d=quantifier-scope-ambiguity&l=en&e=section',
    'http://mathhub.info?a=courses/Jacobs/ComSem&p=hou/sec&d=hounl&l=en&e=section'
  ],
  'ai-1': [
    'http://mathhub.info?a=courses/FAU/AI/course&p=logic/sec&d=resolution&l=en&e=section',
    'http://mathhub.info?a=courses/FAU/AI/course&p=prolog/sec&d=prolog-inference&l=en&e=section',
    'http://mathhub.info?a=courses/Jacobs/CompLog&p=kr/sec&d=kr-intro&l=en&e=section',
    'http://mathhub.info?a=courses/FAU/AI/course&p=logic/sec&d=semweb-intro&l=en&e=section',
    'http://mathhub.info?a=courses/FAU/AI/course&p=logic/sec&d=kr-other&l=en&e=section',
    'http://mathhub.info?a=courses/FAU/AI/course&p=planning/sec&d=fluents&l=en&e=section',
    'http://mathhub.info?a=courses/FAU/AI/course&p=planning/sec&d=framework-intro&l=en&e=section',
    'http://mathhub.info?a=courses/FAU/AI/course&p=planning/sec&d=planning-history&l=en&e=section',
    'http://mathhub.info?a=courses/FAU/AI/course&p=planning/sec&d=pop&l=en&e=section'
  ],
};

function fillCoverage(node: SectionTreeNode, coveredSectionUris: string[]) {
  if (!node || node.tocElem.type !== 'Section') return;
  for (const child of node.children) {
    fillCoverage(child, coveredSectionUris);
  }
  if (node.tocElem?.uri && coveredSectionUris.includes(node.tocElem.uri)) {
    node.isCovered = true;
    node.lectureIdx = Math.ceil(Math.random() * 100);
  }
  // node.started = new Date();
  //node.ended = node.started
}

function getTopLevelSections(
  courseId: string,
  tocElems: FTML.TocElem[],
  parentNode: SectionTreeNode
): SectionTreeNode[] {
  return tocElems
    .map((t) => getSectionTree(courseId, t, parentNode))
    .filter(Boolean)
    .map((t) => (Array.isArray(t) ? t : [t as SectionTreeNode]))
    .flat();
}

function getSectionTree(
  courseId: string,
  tocElem: FTML.TocElem,
  parentNode: SectionTreeNode,
  parentNotCovered = false
): SectionTreeNode | SectionTreeNode[] | undefined {
  if (tocElem.type === 'Paragraph' || tocElem.type === 'Slide') return undefined;
  const isSection = tocElem.type === 'Section';

  if (isSection) {
    const children: SectionTreeNode[] = [];
    const notCovered = parentNotCovered || NOT_COVERED_SECTIONS[courseId]?.includes(tocElem.uri);

    const thisNode = {
      tocElem,
      children,
      parentNode,
      notCovered,
    } as SectionTreeNode;
    for (const s of tocElem.children || []) {
      const subNodes = getSectionTree(courseId, s, thisNode, notCovered);
      if (!subNodes) continue;
      if (Array.isArray(subNodes)) children.push(...subNodes);
      else children.push(subNodes);
    }
    return thisNode;
  } else {
    const children: SectionTreeNode[] = [];
    for (const s of tocElem.children || []) {
      const subNodes = getSectionTree(courseId, s, parentNode, parentNotCovered);
      if (!subNodes) continue;
      if (Array.isArray(subNodes)) children.push(...subNodes);
      else children.push(subNodes);
    }
    return children;
  }
}

function applyFilterOne(
  node?: SectionTreeNode,
  searchTerms?: string[]
): SectionTreeNode | undefined {
  if (!node || !searchTerms?.length) return node;
  const newChildren: SectionTreeNode[] = [];
  for (const childNode of node.children) {
    const newChild = applyFilterOne(childNode, searchTerms);
    if (newChild) newChildren.push(newChild);
  }
  const matchesThisNode = searchTerms.some((term) =>
    node.tocElem.title?.toLowerCase().includes(term)
  );
  if (newChildren.length === 0 && !matchesThisNode) {
    return undefined;
  }
  return {
    parentNode: node.parentNode,
    children: newChildren,
    tocElem: node.tocElem,
  };
}

function applyFilter(
  nodes?: SectionTreeNode[],
  searchTerms?: string[]
): SectionTreeNode[] | undefined {
  if (!nodes || !searchTerms?.length) return nodes;
  return nodes.map((n) => applyFilterOne(n, searchTerms)).filter((n) => n) as any;
}

function getLectureHover(info?: SectionLectureInfo, isSkipped?: boolean) {
  if (isSkipped) return 'Skipped';
  if (!info) return '';
  const { startTime_ms, endTime_ms } = info;
  if (!startTime_ms) return 'Not yet covered';
  const startTimeDisplay = dayjs(startTime_ms).format('DD MMM');
  if (startTime_ms === endTime_ms) return `Covered: ${startTimeDisplay}`;
  if (!endTime_ms) return `Covered: ${startTimeDisplay} to -`;
  const endTimeDisplay = dayjs(endTime_ms).format('DD MMM');
  if (startTimeDisplay.substring(3, 6) === endTimeDisplay.substring(3, 6)) {
    return `Covered: ${startTimeDisplay.substring(0, 2)} to ${endTimeDisplay}`;
  }
  return `Covered: ${startTimeDisplay} to ${endTimeDisplay}`;
}

function RenderTree({
  node,
  level,
  defaultOpen,
  selectedSection,
  perSectionLectureInfo,
  preAdornment,
  onSectionClick,
}: {
  node: SectionTreeNode;
  level: number;
  defaultOpen: boolean;
  selectedSection: string;
  perSectionLectureInfo: Record<FTML.Uri, SectionLectureInfo>;
  preAdornment?: (sectionId: string) => React.ReactElement;
  onSectionClick?: (sectionId: string, sectionUri: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const itemClassName = level === 0 ? styles['level0_dashboard_item'] : styles['dashboard_item'];
  const isSelected = selectedSection === node.tocElem.id;
  const secLectureInfo = perSectionLectureInfo[node.tocElem.uri];
  const lectureHover = getLectureHover(secLectureInfo, node.notCovered);

  const sectionStarted = !!secLectureInfo?.startTime_ms;
  const sectionCompleted = !!secLectureInfo?.endTime_ms;
  const sectionInProgress = sectionStarted && !sectionCompleted;
  const background = node.notCovered
    ? '#fdd'
    : sectionInProgress
    ? `repeating-linear-gradient(45deg, #FFE, #FFE 10px, #FFF 10px, #FFF 20px)`
    : undefined;
  const backgroundColor = sectionCompleted ? '#FFC' : undefined;

  return (
    <Box key={(node.tocElem as any).id} sx={{ py: '6px', backgroundColor, background }}>
      <Box
        display="flex"
        ml={node.children.length > 0 ? undefined : '23px'}
        fontWeight={isSelected ? 'bold' : undefined}
      >
        {node.children.length > 0 && (
          <IconButton
            sx={{ color: 'gray', p: '0', mr: '3px' }}
            onClick={() => setIsOpen((v) => !v)}
          >
            {isOpen ? (
              <IndeterminateCheckBoxOutlinedIcon sx={{ fontSize: '20px' }} />
            ) : (
              <AddBoxOutlinedIcon sx={{ fontSize: '20px' }} />
            )}
          </IconButton>
        )}
        <span
          className={itemClassName}
          style={{
            cursor: 'pointer',
            color: isSelected ? 'white' : undefined,
            padding: isSelected ? '0 3px' : undefined,
            backgroundColor: isSelected ? 'primary.main' : 'inherit',
            borderRadius: '3px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSectionClick?.(node.tocElem.id, node.tocElem.uri);
            return;
          }}
        >
          {preAdornment ? preAdornment(node.tocElem.id) : null}
          {lectureHover ? (
            <Tooltip title={<span style={{ fontSize: 'medium' }}>{lectureHover}</span>}>
              <span>{convertHtmlStringToPlain(node.tocElem.title || 'Untitled')}</span>
            </Tooltip>
          ) : (
            <span>{convertHtmlStringToPlain(node.tocElem.title || 'Untitled')}</span>
          )}
        </span>
      </Box>
      {isOpen && node.children.length > 0 && (
        <Box display="flex" ml="3px">
          <Box
            minWidth="12px"
            sx={{
              cursor: 'pointer',
              '&:hover *': { borderLeft: '1px solid #333' },
            }}
            onClick={() => setIsOpen((v) => !v)}
          >
            <Box width="0" m="auto" borderLeft="1px solid #CCC" height="100%">
              &nbsp;
            </Box>
          </Box>
          <Box>
            {(node.children || []).map((child) => (
              <RenderTree
                key={(child.tocElem as any).id}
                node={child}
                level={level + 1}
                defaultOpen={defaultOpen}
                perSectionLectureInfo={perSectionLectureInfo}
                selectedSection={selectedSection}
                preAdornment={preAdornment}
                onSectionClick={onSectionClick}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

export function getCoveredSections(endSecUri: string, elem: FTML.TocElem | undefined): string[] {
  const coveredUris: string[] = [];
  if (!elem) return coveredUris;
  if ('children' in elem && elem.children?.length) {
    for (const child of elem.children || []) {
      coveredUris.push(...getCoveredSections(endSecUri, child));
      if (coveredUris.includes(endSecUri)) return coveredUris;
    }
  }
  if (elem.type === 'Section') coveredUris.push(elem.uri);

  return coveredUris;
}

function getOrderedSections(elem: FTML.TocElem): [FTML.Uri[], FTML.Uri[]] {
  const preOrderedList: FTML.Uri[] = [];
  const postOrderedList: FTML.Uri[] = [];
  if (!elem) return [preOrderedList, postOrderedList];
  if (elem.type === 'Section') preOrderedList.push(elem.uri);
  if ('children' in elem && elem.children?.length) {
    for (const c of elem.children || []) {
      const [subPreList, subPostList] = getOrderedSections(c);
      preOrderedList.push(...subPreList);
      postOrderedList.push(...subPostList);
    }
  }
  if (elem.type === 'Section') postOrderedList.push(elem.uri);
  return [preOrderedList, postOrderedList];
}

function getNextSectionInList(sectionUri?: FTML.Uri, uriList?: FTML.Uri[]) {
  if (!sectionUri || !uriList?.length) return undefined;
  const idx = uriList.findIndex((uri) => uri === sectionUri);
  if (idx === -1) return undefined;
  if (idx === uriList.length - 1) return undefined; // todo: cleanup
  return uriList[idx + 1];
}

function getPrevSectionInPostOrderNotAChild(
  sectionUri?: FTML.Uri,
  preOrdered?: FTML.Uri[],
  postOrdered?: FTML.Uri[]
) {
  if (!sectionUri || !preOrdered?.length || !postOrdered?.length) return undefined;
  const idxInPostOrder = postOrdered.findIndex((uri) => uri === sectionUri);
  const idxInPreOrder = preOrdered.findIndex((uri) => uri === sectionUri);
  let idx = idxInPostOrder - 1;
  while (idx >= 0) {
    const candidate = postOrdered[idx];
    const candidateIdxInPreOrder = preOrdered.findIndex((uri) => uri === candidate);
    const isChild = candidateIdxInPreOrder > idxInPreOrder;
    if (!isChild) return candidate;
    idx--;
  }
  return undefined;
}

function getNextSectionInPreOrderNotAChild(
  sectionUri?: FTML.Uri,
  preOrdered?: FTML.Uri[],
  postOrdered?: FTML.Uri[]
) {
  if (!sectionUri || !preOrdered?.length || !postOrdered?.length) return undefined;
  const idxInPreOrder = preOrdered.findIndex((uri) => uri === sectionUri);
  const idxInPostOrder = postOrdered.findIndex((uri) => uri === sectionUri);
  let idx = idxInPreOrder + 1;
  while (idx < preOrdered.length) {
    const candidate = preOrdered[idx];
    const candidateIdxInPostOrder = postOrdered.findIndex((uri) => uri === candidate);
    const isChild = candidateIdxInPostOrder < idxInPostOrder;
    if (!isChild) return candidate;
    idx++;
  }
  return undefined;
}

interface SectionLectureInfo {
  startTime_ms?: number;
  endTime_ms?: number;
  lastLectureIdx?: number;
}

function getPerSectionLectureInfo(topLevel: FTML.TocElem, lectureData: LectureEntry[]) {
  const perSectionLectureInfo: Record<FTML.Uri, SectionLectureInfo> = {};
  lectureData = lectureData?.filter((snap) => snap.sectionUri);
  if (!lectureData?.length) return perSectionLectureInfo;
  const [preOrdered, postOrdered] = getOrderedSections(topLevel);
  const firstSectionNotStarted = lectureData.map((snap) => {
    const isPartial = snap.sectionCompleted === false;
    if (!isPartial)
      return getNextSectionInPreOrderNotAChild(snap.sectionUri, preOrdered, postOrdered);
    return getNextSectionInList(snap.sectionUri, preOrdered);
  });

  const lastSectionCompleted = lectureData.map((snap) => {
    const isPartial = snap.sectionCompleted === false;
    if (isPartial)
      return getPrevSectionInPostOrderNotAChild(snap.sectionUri, preOrdered, postOrdered);
    return snap.sectionUri;
  });

  /*For debugging:
  const toPrintableStr = (uri?: string) =>
    uri ? getParamsFromUri(uri, ['p', 'd', 'e']).join('--') : '<no uri>';
  console.log('postOrdered', postOrdered.map(toPrintableStr));
  console.log('preOrdered', preOrdered.map(toPrintableStr));
  console.log('firstSectionNotStarted', firstSectionNotStarted.map(toPrintableStr));
  console.log('lastSectionCompleted', lastSectionCompleted.map(toPrintableStr));*/
  let currLecIdx = 0;
  for (const secUri of preOrdered) {
    while (secUri === firstSectionNotStarted[currLecIdx]) {
      currLecIdx++;
      if (!firstSectionNotStarted[currLecIdx]) break;
    }
    const currentSnap = lectureData[currLecIdx];
    if (!currentSnap?.sectionUri) break;
    perSectionLectureInfo[secUri] = {
      startTime_ms: currentSnap.timestamp_ms,
      // firstLectureIdx: currLecIdx,
    };
  }
  currLecIdx = 0;
  for (const secUri of postOrdered) {
    const currentSnap = lectureData[currLecIdx];
    if (!currentSnap?.sectionUri) break;
    perSectionLectureInfo[secUri] ??= {};
    perSectionLectureInfo[secUri].endTime_ms = currentSnap.timestamp_ms;
    perSectionLectureInfo[secUri].lastLectureIdx = currLecIdx;

    while (secUri === lastSectionCompleted[currLecIdx]) currLecIdx++;
    if (!firstSectionNotStarted[currLecIdx]) break;
  }
  return perSectionLectureInfo;
}

export function ContentDashboard({
  toc,
  selectedSection,
  courseId,
  preAdornment,
  onClose,
  onSectionClick,
}: {
  toc: FTML.TocElem[];
  selectedSection: string;
  courseId?: string;
  preAdornment?: (sectionId: string) => React.ReactElement;
  onClose: () => void;
  onSectionClick?: (sectionId: string, sectionUri: string) => void;
}) {
  const t = getLocaleObject(useRouter());
  const [filterStr, setFilterStr] = useState('');
  const [defaultOpen, setDefaultOpen] = useState(true);
  const [perSectionLectureInfo, setPerSectionLectureInfo] = useState<
    Record<FTML.Uri, SectionLectureInfo>
  >({});

  useEffect(() => {
    async function getCoverageInfo() {
      if (!courseId || !toc?.length) {
        console.log('No courseId or toc');
        return;
      }
      const timeline = await getCoverageTimeline();
      const snaps = timeline?.[courseId];
      const shadowTopLevel: FTML.TocElem = { type: 'SkippedSection', children: toc };
      setPerSectionLectureInfo(getPerSectionLectureInfo(shadowTopLevel, snaps));
    }
    getCoverageInfo();
  }, [courseId, toc]);

  const firstLevelSections = useMemo(() => {
    const shadowTopLevel: SectionTreeNode = { children: [], tocElem: undefined as any };
    const topLevel = getTopLevelSections(courseId || '', toc, shadowTopLevel);
    shadowTopLevel.children = topLevel;
    return topLevel;
  }, [toc]);

  return (
    <FixedPositionMenu
      staticContent={
        <>
          <Box display="flex" alignItems="center" sx={{ m: '5px' }}>
            <IconButton sx={{ m: '2px' }} onClick={() => onClose()}>
              <CloseIcon />
            </IconButton>
            <TextField
              id="tree-filter-string"
              label={t.search}
              value={filterStr}
              onChange={(e) => setFilterStr(e.target.value)}
              sx={{ mx: '5px', width: '100%' }}
              size="small"
            />
          </Box>
          <Box display="flex" justifyContent="space-between" m="5px 10px">
            <Tooltip title={t.expandCollapseAll}>
              <IconButton
                onClick={() => setDefaultOpen((v) => !v)}
                sx={{ border: '1px solid #CCC', borderRadius: '40px' }}
              >
                {defaultOpen ? <UnfoldLessDoubleIcon /> : <UnfoldMoreDoubleIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </>
      }
    >
      {(firstLevelSections || []).map((child) => (
        <RenderTree
          key={(child.tocElem as any).id ?? 'skipped'}
          node={child}
          level={0}
          defaultOpen={defaultOpen}
          selectedSection={selectedSection}
          perSectionLectureInfo={perSectionLectureInfo}
          preAdornment={preAdornment}
          onSectionClick={onSectionClick}
        />
      ))}
    </FixedPositionMenu>
  );
}
