import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, CircularProgress, Divider, IconButton } from '@mui/material';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import {
  BloomDimension,
  getUriSmileys,
  SmileyCognitiveValues,
  smileyToLevel,
} from '@stex-react/api';
import { SafeHtml } from '@stex-react/react-utils';
import { shouldUseDrawer, simpleHash } from '@stex-react/utils';
import axios from 'axios';
import { useRouter } from 'next/router';
import { memo, useContext, useEffect, useRef, useState } from 'react';
import { getLocaleObject } from './lang/utils';
import { FixedPositionMenu, LayoutWithFixedMenu } from './LayoutWithFixedMenu';
import { SelfAssessmentDialog, ServerLinksContext } from './stex-react-renderer';
import styles from './styles/tour-display.module.scss';
import { useOnScreen } from './useOnScreen';

const NAV_MENU_ID = 'list-container';
const EXPANSION_BOX_ID = 'expansion-box';

export interface TourItem {
  uri: string;
  header: string;
  hash: string;
  dependencies: string[];
  successors: string[];
  level: number;
  understood: boolean;
}

function navMenuItemId(item: TourItem) {
  return `nav-${item.hash}`;
}

function expandedItemId(item: TourItem) {
  return `expand-${item.hash}`;
}

function scrollToItem(item: TourItem) {
  const displayItem = document.getElementById(expandedItemId(item));
  displayItem?.scrollIntoView();
}

function getSuccessorChain(item: TourItem, allItemsMap: Map<string, TourItem>) {
  const succChain: string[] = [];
  let succ: TourItem | undefined = item;
  while (succ) {
    succChain.push(succ.uri);
    succ = allItemsMap.get(succ.successors?.[0]);
  }
  return succChain;
}
const RenderedMmtMemo = memo(({ html }: { html: string }) => {
  return <SafeHtml html={html} />;
});

function isConceptUnderstood(val?: SmileyCognitiveValues) {
  const r = smileyToLevel(val?.Remember);
  const u = smileyToLevel(val?.Understand);
  return !!r && !!u && r >= 1 && u >= 1;
}

function ItemBreadcrumbs({
  item,
  allItemsMap,
  addToTempShowUri,
}: {
  item: TourItem;
  allItemsMap: Map<string, TourItem>;
  addToTempShowUri: (uri: string) => void;
}) {
  const t = getLocaleObject(useRouter());
  const succChain = getSuccessorChain(item, allItemsMap);
  return (
    <>
      <ul className={styles['steps']}>
        {/* The box below gives the blur effect in case the breadcrumbs go over one line */}
        <Box className={styles['steps-blur']}></Box>
        {succChain.map((uri) => {
          const item = allItemsMap.get(uri);
          if (!item) return null;
          return (
            <li key={uri} onClick={() => scrollToItem(item)}>
              <a>
                <RenderedMmtMemo html={item.header} />
              </a>
            </li>
          );
        })}
      </ul>
      {!!item.dependencies.length && (
        <Box display="flex" alignItems="center" flexWrap="wrap">
          {t.needs}:&nbsp;
          {item.dependencies.map((depUri) => {
            const dep = allItemsMap.get(depUri);
            if (!dep) return null;
            return (
              <Button
                size="small"
                key={depUri}
                variant="outlined"
                sx={{ m: '0 2px 2px 4px', textTransform: 'none', p: '0px 8px' }}
                onClick={() => {
                  addToTempShowUri(depUri);
                  scrollToItem(dep);
                }}
              >
                <RenderedMmtMemo html={dep.header} />
              </Button>
            );
          })}
        </Box>
      )}
    </>
  );
}

function TourItemDisplay({
  item,
  allItemsMap,
  isTempShow,
  lang = 'en',
  visibilityUpdate,
  onUnderstood,
  onHideTemp,
  addToTempShowUri,
}: {
  item: TourItem;
  allItemsMap: Map<string, TourItem>;
  isTempShow: boolean;
  lang?: string;
  visibilityUpdate: (a: boolean) => void;
  onUnderstood: () => void;
  onHideTemp: () => void;
  addToTempShowUri: (uri: string) => void;
}) {
  const t = getLocaleObject(useRouter());
  const ref = useRef();
  const isVisible = useOnScreen(ref);
  useEffect(() => {
    visibilityUpdate(isVisible);
  }, [isVisible]);

  return (
    <Box id={expandedItemId(item)} maxWidth="600px" width="100%" ref={ref}>
      <Box display="flex" alignItems="start" mt="15px" mb="5px" justifyContent="space-between">
        <h3 style={{ margin: 0 }}>
          <RenderedMmtMemo html={item.header} />
        </h3>
        <Box mx="10px" height="30px" sx={{ whiteSpace: 'nowrap' }}>
          <Box display="flex" alignItems="center" gap="5px" zIndex={10}>
            {isTempShow && (
              <Button
                size="small"
                onClick={() => onHideTemp()}
                variant="outlined"
                sx={{ mr: '10px' }}
              >
                {t.hide}
              </Button>
            )}
            <SelfAssessmentDialog
              dims={[BloomDimension.Remember, BloomDimension.Understand]}
              uri={item.uri}
              htmlName={item.header}
              onUpdate={(v: SmileyCognitiveValues) => {
                if (isConceptUnderstood(v)) onUnderstood();
              }}
            />
          </Box>

          {/*
              <Button
                size="small"
                onClick={() => onMoreDetails()}
                variant="outlined"
              >
                More Details
          </Button>*/}
        </Box>
      </Box>
      <ItemBreadcrumbs item={item} allItemsMap={allItemsMap} addToTempShowUri={addToTempShowUri} />
      <Box sx={{ mt: '20px' }}>
        {/*<ContentFromUrl
          displayReason={DisplayReason.GUIDED_TOUR}
          url={`/:vollki/frag?path=${item.uri}&lang=${lang}`}
          modifyRendered={getChildrenOfBodyNode}
        />*/}
        TODO ALEA4-M2
      </Box>

      <Divider />
    </Box>
  );
}

export interface TourAPIEntry {
  id: string;
  title: string;
  successors: string[];
}

function computeOrderedList(
  tourItems: Map<string, TourItem>,
  understoodUri: string[],
  tempShowUri: string[],
  currentId: string,
  level: number,
  orderedList: TourItem[],
  addOnlyTemp: boolean,
  callStack: Set<string> = new Set()
): void {
  const deps = tourItems.get(currentId)?.dependencies || [];
  const alreadyPreset = orderedList.some((item) => item.uri === currentId);
  if (alreadyPreset) return;

  if (callStack.has(currentId)) {
    console.error(`Circular dependency detected: ${currentId} is already in the call stack`);
    return;
  }

  callStack.add(currentId);

  const isUnderstood = understoodUri.includes(currentId);

  for (const d of deps) {
    computeOrderedList(
      tourItems,
      understoodUri,
      tempShowUri,
      d,
      level + 1,
      orderedList,
      addOnlyTemp || isUnderstood,
      callStack
    );
  }

  callStack.delete(currentId);

  if ((!isUnderstood && !addOnlyTemp) || tempShowUri.includes(currentId)) {
    const currentItem = tourItems.get(currentId);
    if (!currentItem) {
      console.log('Not possible');
      return;
    }
    currentItem.level = level;
    orderedList.push(currentItem);
  }
}

function getTourItemMap(
  tourAPIEntries: TourAPIEntry[],
  smileyVals: Map<string, SmileyCognitiveValues>
) {
  const tourItems: Map<string, TourItem> = new Map();
  for (const entry of tourAPIEntries) {
    tourItems.set(entry.id, {
      uri: entry.id,
      header: entry.title,
      hash: simpleHash(entry.id),
      dependencies: [],
      successors: entry.successors,
      level: 0,
      understood: isConceptUnderstood(smileyVals.get(entry.id)),
    });
  }
  for (const n of tourAPIEntries) {
    for (const s of n.successors) {
      tourItems.get(s)?.dependencies?.push(n.id);
    }
  }
  return tourItems;
}

function getDisplayItemList(
  tourItemMap: Map<string, TourItem>,
  understoodUri: string[],
  tempShowUri: string[]
): TourItem[] {
  const rootItem = Array.from(tourItemMap.values()).find((item) => !item.successors?.length);
  if (!rootItem) return [];

  if (understoodUri.includes(rootItem.uri)) {
    return [rootItem];
  }
  const orderedList: TourItem[] = [];
  computeOrderedList(tourItemMap, understoodUri, tempShowUri, rootItem.uri, 0, orderedList, false);
  return orderedList;
}

function listItemText(item: TourItem, isIntersecting: boolean) {
  const fontWeight = isIntersecting ? 'bold' : undefined;
  return (
    <Box>
      <span style={{ fontWeight }}>
        <RenderedMmtMemo html={item.header} />
      </span>
    </Box>
  );
}

function LeftGuide({ children, level }: { children: any; level: number }) {
  return (
    <Box display="flex">
      {Array(level)
        .fill(0)
        .map((_, idx) => (
          <Box display="inline" key={idx} sx={{ ml: `10px`, borderLeft: '1px solid #BBB' }}></Box>
        ))}
      <Box display="flex" p="0" alignItems="center">
        <span
          style={{
            color: '#BBB',
            fontSize: '10px',
            whiteSpace: 'nowrap',
            marginRight: '1px',
            display: 'inline',
          }}
        >
          {level !== 0 && '--'}
        </span>
        <Box
          sx={{
            px: '4px',
            py: '2px',
            mb: '4px',
            border: '1px solid #BBB',
            borderRadius: '5px',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}

function NavBar({
  items,
  itemVisibility,
  onClose,
}: {
  items: TourItem[];
  itemVisibility: any;
  onClose: () => void;
}) {
  const t = getLocaleObject(useRouter());
  useEffect(() => {
    scrollNavToShowVisibleItems(items, itemVisibility);
  }, [items]);

  return (
    <FixedPositionMenu
      staticContent={
        <Box display="flex" alignItems="center">
          <IconButton sx={{ m: '2px' }} onClick={() => onClose()}>
            <CloseIcon />
          </IconButton>
          {t.guidedTour}
        </Box>
      }
    >
      <List id={NAV_MENU_ID}>
        {items.map((item) => (
          <ListItem
            disablePadding
            key={item.hash}
            id={navMenuItemId(item)}
            sx={{ cursor: 'pointer' }}
            onClick={() => scrollToItem(item)}
          >
            <Box sx={{ mx: '10px' }}>
              <LeftGuide level={item.level}>
                <ListItemText
                  sx={{ m: '0' }}
                  primary={listItemText(item, itemVisibility[item.hash])}
                />
              </LeftGuide>
            </Box>
          </ListItem>
        ))}
      </List>
    </FixedPositionMenu>
  );
}

function scrollNavToShowVisibleItems(
  items: TourItem[],
  itemVisibility: { [hash: string]: boolean }
) {
  const idx = items.findIndex((item) => itemVisibility[item.hash]);
  if (idx < 0) return;
  const container = document.getElementById(NAV_MENU_ID);
  const displayItem = document.getElementById(navMenuItemId(items[idx > 0 ? idx - 1 : idx]));
  if (!container || !displayItem) return;
  container.scrollTop = displayItem.offsetTop;
}

export function TourDisplay({
  tourId,
  language = 'en',
  topOffset,
}: {
  tourId: string;
  language?: string;
  topOffset: number;
}) {
  const [allItemsMap, setAllItemsMap] = useState(new Map<string, TourItem>());
  const [displayItemList, setDisplayItemList] = useState([] as TourItem[]);
  // Object to hold each item's current visibility. Keys are hashes of the item's uri.
  const [itemVisibility, setItemVisibility] = useState<{
    [hash: string]: boolean;
  }>({});
  const [showDashboard, setShowDashboard] = useState(!shouldUseDrawer());
  const [fetchingItems, setFetchingItems] = useState(false);
  const [understoodUri, setUnderstoodUriList] = useState([] as string[]);
  const [tempShowUri, setTempShowUri] = useState([] as string[]);
  const { mmtUrl } = useContext(ServerLinksContext);

  useEffect(() => {
    if (!tourId?.length) return;
    const tourInfoUrl = `${mmtUrl}/:vollki/tour?path=${tourId}&user=nulluser&lang=${language}`;
    setFetchingItems(true);
    // TODO ALEA4-M2
    axios.get(tourInfoUrl).then((r) => {
      setFetchingItems(false);
      const apiEntries: TourAPIEntry[] = r.data;
      const tourUris = apiEntries.map((e) => e.id);
      getUriSmileys(tourUris).then((smileyVals) => {
        const understood = [];
        for (const uri of tourUris) {
          if (isConceptUnderstood(smileyVals.get(uri))) {
            understood.push(uri);
          }
        }
        setUnderstoodUriList(understood);
        setAllItemsMap(getTourItemMap(apiEntries, smileyVals));
      });
    });
  }, [tourId, language, mmtUrl]);

  useEffect(() => {
    setDisplayItemList(getDisplayItemList(allItemsMap, understoodUri, tempShowUri));
  }, [allItemsMap, understoodUri, tempShowUri]);

  useEffect(() => {
    scrollNavToShowVisibleItems(displayItemList, itemVisibility);
  }, [itemVisibility]);

  function addToUnderstoodList(uri: string) {
    setUnderstoodUriList((previous) => {
      if (previous.includes(uri)) return previous;
      return [...previous, uri];
    });
    const item = allItemsMap.get(uri);
    if (item) item.understood = true;
  }

  /*function removeFromUnderstoodList(uri: string) {
    setUnderstoodUriList((previous) => previous.filter((u) => u !== uri));
    setUriWeights({ [uri]: 0.0 }).then(console.log);
    const item = allItemsMap.get(uri);
    if (item) item.weight = 0;
  }*/

  function addToTempShowUri(uri: string) {
    setTempShowUri((previous) => {
      if (previous.includes(uri)) return previous;
      return [...previous, uri];
    });
  }

  function removeFromTempShowUri(uri: string) {
    setTempShowUri((previous) => previous.filter((u) => u !== uri));
  }

  if (fetchingItems) return <CircularProgress />;
  if (!displayItemList?.length) return null;

  return (
    <LayoutWithFixedMenu
      topOffset={topOffset}
      menu={
        <NavBar
          items={displayItemList}
          itemVisibility={itemVisibility}
          onClose={() => setShowDashboard(false)}
        />
      }
      showDashboard={showDashboard}
      setShowDashboard={setShowDashboard}
    >
      <Box id={EXPANSION_BOX_ID} sx={{ overflowY: 'auto' }} flexGrow={1} flexBasis="600px">
        <Box mx="10px">
          {displayItemList.map((item) => (
            <TourItemDisplay
              key={item.hash}
              item={item}
              allItemsMap={allItemsMap}
              lang={language}
              isTempShow={tempShowUri.includes(item.uri)}
              onUnderstood={() => addToUnderstoodList(item.uri)}
              onHideTemp={() => removeFromTempShowUri(item.uri)}
              addToTempShowUri={addToTempShowUri}
              visibilityUpdate={(visibility) => {
                setItemVisibility((prev) => {
                  const newV = { ...prev };
                  newV[item.hash] = visibility;
                  return newV;
                });
              }}
            />
          ))}
        </Box>
      </Box>
    </LayoutWithFixedMenu>
  );
}
