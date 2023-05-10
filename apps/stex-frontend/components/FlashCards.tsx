import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CancelIcon from '@mui/icons-material/Cancel';
import CloseIcon from '@mui/icons-material/Close';
import FlipCameraAndroidIcon from '@mui/icons-material/FlipCameraAndroid';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  BloomDimension,
  getUriSmileys,
  isLoggedIn,
  SmileyCognitiveValues,
  smileyToLevel,
  SmileyType,
} from '@stex-react/api';
import {
  ContentFromUrl,
  ContentWithHighlight,
  FixedPositionMenu,
  LayoutWithFixedMenu,
  LevelIcon,
  SelfAssessment2,
} from '@stex-react/stex-react-renderer';
import {
  convertHtmlStringToPlain,
  getChildrenOfBodyNode,
  localStore,
  PRIMARY_COL,
} from '@stex-react/utils';
import { useRouter } from 'next/router';
import {
  Dispatch,
  Fragment,
  SetStateAction,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useSwipeable } from 'react-swipeable';
import { getLocaleObject } from '../lang/utils';
import styles from '../styles/flash-card.module.scss';

enum CardType {
  ITEM_CARD,
  SUMMARY_CARD,
}

export enum FlashCardMode {
  REVISION_MODE,
  DRILL_MODE,
}

function isDrill(mode: FlashCardMode) {
  return mode === FlashCardMode.DRILL_MODE;
}

export interface FlashCardItem {
  uri: string;
  instances: { htmlNode: string }[];
}

export function FlashCardFooter({
  uri,
  isFront,
  needUpdateMarker,
  onFlip,
}: {
  uri: string;
  isFront: boolean;
  needUpdateMarker: any;
  onFlip: () => void;
}) {
  const loggedIn = isLoggedIn();
  const { locale } = useRouter();
  const { flashCards: t } = getLocaleObject({ locale });
  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100%"
      alignItems="center"
      margin="5px 15px"
    >
      {loggedIn && (
        <Box display="flex" alignItems="center" gap="10px" px="10px">
          <Typography variant="h6" color="gray" textAlign="right">
            {t.assessYourComptence}:
          </Typography>
          <Box flexShrink={0}>
            <SelfAssessment2
              dims={[BloomDimension.Remember, BloomDimension.Understand]}
              uri={uri}
              needUpdateMarker={needUpdateMarker}
            />
          </Box>
        </Box>
      )}
      <IconButton onClick={onFlip} color="primary" sx={{ m: 'auto' }}>
        <Tooltip title={isFront ? t.flipCard : t.flipBack}>
          <FlipCameraAndroidIcon
            fontSize="large"
            sx={{ transform: 'rotateX(30deg)' }}
          />
        </Tooltip>
      </IconButton>
    </Box>
  );
}
function dedupNodes(nodes: string[]) {
  if (nodes.length <= 1) return nodes;
  const texts = nodes.map((n) => convertHtmlStringToPlain(n).toLowerCase());
  const selectedIdxs = [];
  for (const [idx, textA] of texts.entries()) {
    let dup = false;
    for (let i = 0; i < idx; i++) {
      if (textA === texts[i]) {
        dup = true;
        break;
      }
    }
    if (!dup) selectedIdxs.push(idx);
  }
  return selectedIdxs.map((idx) => nodes[idx]);
}

function getConceptName(uri: string) {
  const parts = uri.split('?');
  return parts[parts.length - 1];
}

function FlashCardFront({
  uri,
  htmlNodes,
  needUpdateMarker,
  onFlip,
}: {
  uri: string;
  htmlNodes: string[];
  needUpdateMarker: any;
  onFlip: () => void;
}) {
  const synonyms = [uri]; //dedupNodes(htmlNodes);
  return (
    <Box className={styles['front']}>
      &nbsp;
      <Box
        sx={{
          width: 'max-content',
          m: '0 auto',
          textAlign: 'center',
          maxWidth: '100%',
        }}
      >
        {synonyms.map((htmlNode, idx) => (
          <Fragment key={idx}>
            <Box
              sx={{
                '& *': {
                  fontSize: `${idx === 0 ? 32 : 20}px !important`,
                  overflowX: 'unset !important', // Fix for https://github.com/slatex/sTeX-React/issues/63
                },
              }}
            >
              <span style={{ fontSize: '32px', color: '#ed028c' }}>
                {getConceptName(uri)}
              </span>
              {/*<ContentWithHighlight mmtHtml={htmlNode} />*/}
            </Box>
            {idx === 0 && synonyms.length > 1 && (
              <Typography fontSize="12px" my="5px" color="gray">
                a.k.a.
              </Typography>
            )}
          </Fragment>
        ))}
      </Box>
      <FlashCardFooter
        uri={uri}
        onFlip={onFlip}
        isFront={true}
        needUpdateMarker={needUpdateMarker}
      />
    </Box>
  );
}

function FlashCardBack({
  uri,
  needUpdateMarker,
  onFlip,
}: {
  uri: string;
  needUpdateMarker: any;
  onFlip: () => void;
}) {
  return (
    <Box className={styles['back']}>
      <Box
        sx={{
          overflowY: 'auto',
          maxWidth: '100%',
          m: '10px 5px 0',
          '& *': { fontSize: 'large !important' },
        }}
      >
        <ContentFromUrl
          url={`/:sTeX/fragment?${uri}`}
          modifyRendered={getChildrenOfBodyNode}
        />
      </Box>

      <FlashCardFooter
        uri={uri}
        onFlip={onFlip}
        isFront={false}
        needUpdateMarker={needUpdateMarker}
      />
    </Box>
  );
}

function FlashCard({
  uri,
  htmlNodes,
  mode,
  defaultFlipped,
  onNext,
  onPrev,
}: {
  uri: string;
  htmlNodes: string[];
  mode: FlashCardMode;
  defaultFlipped: boolean;
  onNext: () => void;
  onPrev: () => void;
}) {
  const [isFlipped, setIsFlipped] = useState(defaultFlipped);
  useEffect(() => {
    setIsFlipped(defaultFlipped);
  }, [uri]);

  const [lastTapTimeMs, setLastTapTimeMs] = useState(0);

  const handlers = useSwipeable({
    onSwipedLeft: (e) => onNext(),
    onSwipedRight: (e) => {
      if (!isDrill(mode)) onPrev();
    },
    onTap: (e) => {
      const currentTimeMs = Date.now();
      if (currentTimeMs - lastTapTimeMs < 300) {
        setIsFlipped((prev) => !prev);
        setLastTapTimeMs(0);
      } else {
        setLastTapTimeMs(currentTimeMs);
      }
    },
    delta: 50,
  });

  useEffect(() => {
    const handleFlip = (event: KeyboardEvent) => {
      if (event.code === 'ArrowDown' || event.code === 'ArrowUp') {
        setIsFlipped((prev) => !prev);
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', handleFlip, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleFlip, { capture: true });
    };
  }, []);

  return (
    <Box
      display="flex"
      margin="0 5px"
      alignItems="center"
      justifyContent="center"
      flexWrap="wrap"
    >
      <Box
        display="flex"
        maxWidth="600px"
        width="100%"
        height="800px"
        maxHeight="calc(100vh - 70px)"
        margin="auto"
        {...handlers}
      >
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          width="100%"
        >
          <Box
            className={`${styles['card-container']} ${
              isFlipped ? styles['flipped'] : ''
            }`}
          >
            <FlashCardFront
              uri={uri}
              htmlNodes={htmlNodes}
              onFlip={() => setIsFlipped(true)}
              needUpdateMarker={isFlipped}
            />
            <FlashCardBack
              uri={uri}
              onFlip={() => setIsFlipped(false)}
              needUpdateMarker={isFlipped}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function filterItems(
  items: FlashCardItem[],
  uriMap: Map<string, SmileyCognitiveValues>,
  rememberValues: SmileyType[],
  understandValues: SmileyType[]
) {
  return items.filter((item) => {
    const smileyVal = uriMap.get(item.uri);
    return (
      rememberValues.includes(smileyVal?.Remember) &&
      understandValues.includes(smileyVal?.Understand)
    );
  });
}
const GOOD_SMILEYS: SmileyType[] = ['smiley1', 'smiley2'];
const NOT_GOOD_SMILEYS: SmileyType[] = ['smiley-2', 'smiley-1', 'smiley0'];

export function ItemListWithStatus({
  items,
  uriMap,
}: {
  items: FlashCardItem[];
  uriMap: Map<string, SmileyCognitiveValues>;
}) {
  const router = useRouter();
  const { flashCards: t } = getLocaleObject(router);

  return (
    <table style={{ marginBottom: '20px' }}>
      <tr style={{ color: PRIMARY_COL }}>
        <th>{t.concept}</th>
        <th>{t.remember}</th>
        <th>{t.understand}</th>
      </tr>
      {items.map((item) => {
        const smileyLevel = uriMap.get(item.uri);
        const rememberLevel = smileyToLevel(smileyLevel.Remember);
        const understandLevel = smileyToLevel(smileyLevel.Understand);
        return (
          <tr key={item.uri}>
            <td>
              <Box mr="10px">
                <ContentWithHighlight mmtHtml={getConceptName(item.uri)} />
              </Box>
            </td>
            <td>
              <Box m="auto" textAlign="center">
                <LevelIcon level={rememberLevel} highlighted={true} />
              </Box>
            </td>
            <td>
              <Box m="auto" textAlign="center">
                <LevelIcon level={understandLevel} highlighted={true} />
              </Box>
            </td>
          </tr>
        );
      })}
    </table>
  );
}

export function SummaryCard({
  items,
  onFinish,
}: {
  items: FlashCardItem[];
  onFinish: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { locale } = useRouter();
  const { flashCards: t } = getLocaleObject({ locale });

  const [uriMap, setUriMap] = useState<Map<string, SmileyCognitiveValues>>(
    new Map()
  );

  useEffect(() => {
    setIsLoading(true);
    getUriSmileys(items.map((item) => item.uri)).then((uriSmileys) => {
      setIsLoading(false);
      setUriMap(uriSmileys);
    });
  }, [items]);

  const rememberAndUnderstand = filterItems(
    items,
    uriMap,
    GOOD_SMILEYS,
    GOOD_SMILEYS
  );
  const rememberNotUnderstand = filterItems(
    items,
    uriMap,
    GOOD_SMILEYS,
    NOT_GOOD_SMILEYS
  );
  const notRememberButUnderstand = filterItems(
    items,
    uriMap,
    NOT_GOOD_SMILEYS,
    GOOD_SMILEYS
  );
  const notRememberNotUnderstand = filterItems(
    items,
    uriMap,
    NOT_GOOD_SMILEYS,
    NOT_GOOD_SMILEYS
  );

  const numRemembered =
    rememberAndUnderstand.length + rememberNotUnderstand.length;
  const numUnderstood =
    rememberAndUnderstand.length + notRememberButUnderstand.length;
  if (isLoading) return <CircularProgress />;
  return (
    <Card>
      <CardContent sx={{ mx: '10px' }}>
        <Box>
          <Button variant="contained" onClick={() => onFinish()}>
            <ArrowBackIcon />
            &nbsp;{t.goBack}
          </Button>
          <Box m="20px 0">
            <Typography variant="h6">
              {locale === 'de' ? (
                <>
                  Sie haben sich an <b>{numRemembered}</b> erinnert und{' '}
                  <b>{numUnderstood}</b> von <b>{items.length}</b> Konzepten
                  verstanden.
                </>
              ) : (
                <>
                  You recalled <b>{numRemembered}</b> and understoood{' '}
                  <b>{numUnderstood}</b> out of <b>{items.length}</b> concepts.
                </>
              )}
            </Typography>
          </Box>
          {notRememberNotUnderstand.length > 0 && (
            <>
              <Typography variant="h5">
                {t.notRememberedNotUnderstood}
              </Typography>
              <ItemListWithStatus
                items={notRememberNotUnderstand}
                uriMap={uriMap}
              />
            </>
          )}
          {rememberNotUnderstand.length > 0 && (
            <>
              <Typography variant="h5">{t.rememberedNotUnderstood}</Typography>
              <ItemListWithStatus
                items={rememberNotUnderstand}
                uriMap={uriMap}
              />
            </>
          )}
          {notRememberButUnderstand.length > 0 && (
            <>
              <Typography variant="h5">{t.understoodNotRemembered}</Typography>
              <ItemListWithStatus
                items={notRememberButUnderstand}
                uriMap={uriMap}
              />
            </>
          )}
          {rememberAndUnderstand.length > 0 && (
            <>
              <Typography variant="h5">{t.rememberedAndUnderstood}</Typography>
              <ItemListWithStatus
                items={rememberAndUnderstand}
                uriMap={uriMap}
              />
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export function FlashCards({
  mode,
  cards,
  onFinish: onFinish,
}: {
  mode: FlashCardMode;
  cards: FlashCardItem[];
  onFinish: () => void;
}) {
  const [showDashboard, setShowDashboard] = useState(false);
  const [cardNo, setCardNo] = useState(0);
  return (
    <LayoutWithFixedMenu
      menu={
        <FlashCardNavigation
          cards={cards}
          cardNo={cardNo}
          onClose={() => setShowDashboard(false)}
          onSelect={isDrill(mode) ? undefined : (c) => setCardNo(c)}
        />
      }
      topOffset={64}
      showDashboard={showDashboard}
      setShowDashboard={setShowDashboard}
      drawerAnchor="left"
    >
      <FlashCardsContainer
        mode={mode}
        cards={cards}
        cardNo={cardNo}
        setCardNo={setCardNo}
        onFinish={onFinish}
      />
    </LayoutWithFixedMenu>
  );
}

export function FlashCardNavigation({
  cards,
  onClose,
  onSelect,
  cardNo,
}: {
  cards: FlashCardItem[];
  cardNo: number;
  onClose: () => void;
  onSelect?: (idx: number) => void;
}) {
  return (
    <FixedPositionMenu
      staticContent={
        <Box display="flex" alignItems="center">
          <IconButton sx={{ m: '2px' }} onClick={() => onClose()}>
            <CloseIcon />
          </IconButton>
          Stack ({cards.length} cards)
        </Box>
      }
    >
      {cards.map((card, cardIdx) => (
        <Box
          key={cardIdx}
          m="5px"
          sx={{
            '& *': {
              fontSize: `20px !important`,
              cursor: onSelect ? undefined : 'auto !important',
              userSelect: 'none',
              color:
                !onSelect && cardIdx < cardNo ? 'gray !important' : undefined,
            },
          }}
          onClick={() => onSelect(cardIdx)}
        >
          <span
            style={{
              fontSize: '20px',
              cursor: onSelect ? 'pointer' : undefined,
              color:
                !onSelect && cardIdx < cardNo ? 'gray !important' : undefined,
            }}
          >
            {getConceptName(card.uri)}
          </span>
          {/*<ContentWithHighlight mmtHtml={card.instances[0].htmlNode} />*/}
        </Box>
      ))}
    </FixedPositionMenu>
  );
}

function FlashCardsContainer({
  mode,
  cards,
  cardNo,
  setCardNo,
  onFinish: onFinish,
}: {
  mode: FlashCardMode;
  cards: FlashCardItem[];
  cardNo: number;
  setCardNo: Dispatch<SetStateAction<number>>;
  onFinish: () => void;
}) {
  const [cardType, setCardType] = useState(CardType.ITEM_CARD);
  const [drillCardsSeen, setDrillCardsSeen] = useState(0);
  const { locale } = useRouter();
  const { flashCards: t } = getLocaleObject({ locale });

  const [defaultFlipped, setDefaultSkipped] = useState(
    !!localStore?.getItem('default-flipped')
  );

  const currentItem = cards[cardNo];

  useEffect(() => {
    if (
      mode !== FlashCardMode.REVISION_MODE ||
      cardType !== CardType.ITEM_CARD
    ) {
      return;
    }
    const handlePrevAndNext = (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft') {
        setCardNo((prev) => (prev + cards.length - 1) % cards.length);
      }
      if (event.code === 'ArrowRight') {
        setCardNo((prev) => (prev + 1) % cards.length);
      }
    };

    window.addEventListener('keydown', handlePrevAndNext);

    return () => {
      window.removeEventListener('keydown', handlePrevAndNext);
    };
  }, [cardType, mode]);

  if (cardType === CardType.SUMMARY_CARD) {
    return (
      <SummaryCard
        items={cards.slice(0, drillCardsSeen)}
        onFinish={() => onFinish()}
      />
    );
  }
  return (
    <Box mt="10px" display="flex" flexDirection="column">
      <FlashCard
        uri={currentItem.uri}
        htmlNodes={(currentItem.instances || []).map((i) => i.htmlNode)}
        mode={mode}
        defaultFlipped={defaultFlipped && !isDrill(mode)}
        onNext={() => {
          if (cardNo >= cards.length - 1 && isDrill(mode)) {
            setDrillCardsSeen(cards.length);
            setCardType(CardType.SUMMARY_CARD);
          }
          setCardNo((prev) => (prev + 1) % cards.length);
        }}
        onPrev={() =>
          setCardNo((prev) => (prev + cards.length - 1) % cards.length)
        }
      />
      <Box mt="10px" display="flex" justifyContent="space-between">
        <IconButton
          onClick={() => {
            if (!isDrill(mode)) {
              onFinish();
            } else if (confirm(t.leaveEarly)) {
              setDrillCardsSeen(cardNo + 1);
              setCardType(CardType.SUMMARY_CARD);
            }
          }}
          sx={{ minWidth: '90px' }}
        >
          {isDrill(mode) ? <CancelIcon /> : <ArrowBackIcon />}
        </IconButton>

        <Box>
          {!isDrill(mode) && (
            <Button
              onClick={() =>
                setCardNo((prev) => (prev + cards.length - 1) % cards.length)
              }
              size="small"
              variant="contained"
              sx={{ mr: '10px' }}
            >
              <NavigateBeforeIcon />
              {t.prev}
            </Button>
          )}

          <Button
            onClick={() => {
              if (cardNo >= cards.length - 1 && isDrill(mode)) {
                setDrillCardsSeen(cards.length);
                setCardType(CardType.SUMMARY_CARD);
              }
              setCardNo((prev) => (prev + 1) % cards.length);
            }}
            size="small"
            variant="contained"
          >
            {t.next}
            <NavigateNextIcon />
          </Button>
        </Box>
        <Box sx={{ m: '10px 20px', color: '#333', minWidth: '60px' }}>
          <b style={{ fontSize: '18px' }}>
            {cardNo + 1} of {cards.length}
          </b>
        </Box>
      </Box>

      {mode === FlashCardMode.REVISION_MODE && (
        <FormControlLabel
          control={
            <Checkbox
              checked={defaultFlipped}
              onChange={(e) => {
                const v = e.target.checked;
                if (v) localStore?.setItem('default-flipped', '1');
                else localStore?.removeItem('default-flipped');
                setDefaultSkipped(v);
              }}
            />
          }
          label={t.showBackface}
          sx={{ m: '5px auto 0' }}
        />
      )}
    </Box>
  );
}
