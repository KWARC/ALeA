import ShuffleIcon from '@mui/icons-material/Shuffle';
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  List,
  ListItem,
  Tooltip,
  Typography,
} from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { BloomDimension, CardsWithSmileys, SmileyLevel, smileyToLevel } from '@alea/spec';
import { SafeHtml, useIsLoggedIn } from '@alea/react-utils';
import { ConfigureLevelSlider } from '@alea/stex-react-renderer';
import { Window, stableShuffle } from '@alea/utils';
import axios from 'axios';
import { useRouter } from 'next/router';
import { Dispatch, Fragment, SetStateAction, useEffect, useState } from 'react';
import { getLocaleObject } from '../lang/utils';
import { FlashCardMode, FlashCards } from './FlashCards';

const FLASH_CARD_SCROLL_Y = 62;
function cardMeetsLevelReqs(card: CardsWithSmileys, loggedIn: boolean, levels: ConfiguredLevel) {
  if (!loggedIn) return true;
  const dimsToConsider = [BloomDimension.Remember, BloomDimension.Understand].filter(
    (dim) => (levels as any)[dim] !== undefined
  );
  if (!dimsToConsider.length) return true;
  return dimsToConsider.some(
    (dim) => (smileyToLevel(card.smileys[dim]) as any) <= (levels as any)[dim]
  );
}

function getSectionCounts(
  levels: ConfiguredLevel,
  loggedIn: boolean,
  cards?: CardsWithSmileys[]
): {
  chapterTitle: string;
  sectionTitle: string;
  totalCount: number;
  selectedCards: CardsWithSmileys[];
}[] {
  if (!cards) return [];
  const counts: {
    chapterTitle: string;
    sectionTitle: string;
    totalCount: number;
    selectedCards: CardsWithSmileys[];
  }[] = [];
  for (const card of cards) {
    const { sectionTitle, chapterTitle } = card;

    const selected = cardMeetsLevelReqs(card, loggedIn, levels);
    const idx = counts.findIndex((v) => v.sectionTitle === sectionTitle);
    if (idx === -1) {
      counts.push({
        chapterTitle,
        sectionTitle,
        totalCount: 1,
        selectedCards: selected ? [card] : [],
      });
    } else {
      counts[idx].totalCount++;
      if (selected) counts[idx].selectedCards.push(card);
    }
  }
  return counts;
}

function getUpdatedConfigLevel(
  existing: ConfiguredLevel,
  dim: BloomDimension,
  newValue?: SmileyLevel
): ConfiguredLevel {
  return { ...existing, [dim]: newValue };
}

export interface ConfiguredLevel {
  Remember?: SmileyLevel;
  Understand?: SmileyLevel;
}

function LevelConfigurator({
  levels,
  setLevels,
}: {
  levels: ConfiguredLevel;
  setLevels: Dispatch<SetStateAction<ConfiguredLevel>>;
}) {
  const router = useRouter();
  const { flashCards: t } = getLocaleObject(router);
  return (
    <>
      <Tooltip title={t.chooseCompetencyHover}>
        <Typography variant="h6" style={{ textAlign: 'center' }}>
          {t.chooseCompetency}
        </Typography>
      </Tooltip>
      <i style={{ color: '#777' }}>{t.chooseCompetencyDetails}</i>
      {[BloomDimension.Remember, BloomDimension.Understand].map((dim, idx) => (
        <Box
          key={dim}
          display="flex"
          width="220px"
          m="0 auto 10px"
          alignItems="center"
          p="0 20px 20px 0"
          borderBottom={idx === 0 ? '1px solid #DDD' : undefined}
        >
          <ConfigureLevelSlider
            levels={levels}
            dim={dim}
            onChange={(newValue: SmileyLevel) => {
              setLevels((prev) => getUpdatedConfigLevel(prev, dim, newValue));
            }}
            onIconClick={() => {
              setLevels((prev) => {
                const newVal = (levels as any)[dim] === undefined ? 2 : undefined;
                return getUpdatedConfigLevel(prev, dim, newVal);
              });
            }}
          />
        </Box>
      ))}
    </>
  );
}
function addIfNeeded(arr: number[], num: number) {
  const existingIdx = arr.indexOf(num);
  if (existingIdx === -1) arr.push(num);
}

function removeIfNeeded(arr: number[], num: number) {
  const existingIdx = arr.indexOf(num);
  if (existingIdx !== -1) arr.splice(existingIdx, 1);
}

function CoverageConfigurator({
  sectionCounts,
  checkedChapterIdxs,
  setCheckedChapterIdxs,
  startSingleChapter,
  shuffle,
}: {
  sectionCounts: {
    chapterTitle: string;
    sectionTitle: string;
    totalCount: number;
    selectedCards: CardsWithSmileys[];
  }[];
  checkedChapterIdxs: number[];
  setCheckedChapterIdxs: Dispatch<SetStateAction<number[]>>;
  startSingleChapter: (chapterIdx: number, mode: FlashCardMode) => void;
  shuffle: boolean;
}) {
  const handleToggle = (value: number) => () => {
    const currentIndex = checkedChapterIdxs.indexOf(value);
    const newChecked = [...checkedChapterIdxs];
    if (currentIndex === -1) {
      newChecked.push(value);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setCheckedChapterIdxs(newChecked);
  };
  const { loggedIn } = useIsLoggedIn();
  const router = useRouter();
  const { flashCards: t } = getLocaleObject(router);

  return (
    <>
      <Tooltip title={t.chooseCoverageHover}>
        <Typography variant="h6" style={{ textAlign: 'center' }}>
          {t.chooseCoverage}
        </Typography>
      </Tooltip>
      <List sx={{ bgcolor: 'background.paper' }}>
        {sectionCounts.map(({ chapterTitle, sectionTitle, totalCount, selectedCards }, idx) => {
          const labelId = `checkbox-list-label-${idx}`;
          const isChapterStart = idx === 0 || sectionCounts[idx - 1].chapterTitle !== chapterTitle;

          return (
            <Fragment key={idx}>
              {isChapterStart && (
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => {
                      const idxs: number[] = [];
                      for (const [idx, section] of sectionCounts.entries()) {
                        if (section.chapterTitle === chapterTitle) idxs.push(idx);
                      }
                      const setAll = idxs.some((idx) => !checkedChapterIdxs.includes(idx));
                      const newChecked = [...checkedChapterIdxs];
                      if (setAll) {
                        idxs.forEach((idx) => addIfNeeded(newChecked, idx));
                      } else {
                        idxs.forEach((idx) => removeIfNeeded(newChecked, idx));
                      }
                      setCheckedChapterIdxs(newChecked);
                    }}
                  >
                    <b style={{ display: 'block', color: 'primary.main', fontSize: 'large' }}>
                      <SafeHtml html={chapterTitle} />
                    </b>
                  </ListItemButton>
                </ListItem>
              )}
              <ListItem disablePadding>
                <ListItemButton onClick={handleToggle(idx)} dense sx={{ p: '0 0 0 10px', m: '0' }}>
                  <ListItemIcon sx={{ minWidth: '30px' }}>
                    <Checkbox
                      edge="start"
                      checked={checkedChapterIdxs.indexOf(idx) !== -1}
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ 'aria-labelledby': labelId }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    id={labelId}
                    primary={
                      <Box sx={{ fontSize: '14px' }}>
                        <b style={{ display: 'block', color: 'primary.main' }}>
                          <SafeHtml html={sectionTitle} />
                        </b>
                        <b style={{ color: 'secondary.main' }}>
                          {loggedIn && selectedCards.length + '/'}
                          {totalCount}&nbsp;{t.concepts}
                        </b>
                      </Box>
                    }
                  />

                  {selectedCards.length ? (
                    <Box display="flex" alignItems="center" gap="5px 10px">
                      <Button
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          startSingleChapter(idx, FlashCardMode.REVISION_MODE);
                        }}
                      >
                        {t.revise}
                      </Button>
                      {loggedIn && (
                        <Button
                          size="small"
                          sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            startSingleChapter(idx, FlashCardMode.DRILL_MODE);
                          }}
                        >
                          {t.drill}&nbsp;
                          {shuffle && <ShuffleIcon fontSize="small" />}
                        </Button>
                      )}
                    </Box>
                  ) : null}
                </ListItemButton>
              </ListItem>
            </Fragment>
          );
        })}
      </List>
    </>
  );
}

function ReviseAndDrillButtons({
  selectedCards,
  start,
  shuffle,
  setShuffle,
}: {
  selectedCards: CardsWithSmileys[];
  start: (mode: FlashCardMode) => void;
  shuffle: boolean;
  setShuffle: (r: boolean) => void;
}) {
  const { loggedIn } = useIsLoggedIn();
  const isDisabled = selectedCards.length === 0;
  const router = useRouter();
  const { flashCards: t } = getLocaleObject(router);

  return (
    <Box textAlign={'center'} mt="20px">
      <FormControlLabel
        control={<Checkbox checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />}
        label={t.shuffleCards}
      />
      <Box display="flex" gap="10px" justifyContent="center" mb="5px">
        <Button
          variant="contained"
          disabled={isDisabled}
          onClick={(e) => {
            e.stopPropagation();
            start(FlashCardMode.REVISION_MODE);
          }}
        >
          {t.revise}
        </Button>
        {loggedIn && (
          <Button
            variant="contained"
            disabled={isDisabled}
            onClick={(e) => {
              e.stopPropagation();
              start(FlashCardMode.DRILL_MODE);
            }}
          >
            {t.drill}&nbsp;
            {shuffle && <ShuffleIcon fontSize="small" />}
          </Button>
        )}
      </Box>

      <b
        style={{
          color: 'secondary.main',
          textAlign: 'center',
          display: 'block',
          fontFamily: "'Roboto'",
        }}
      >
        {selectedCards.length}&nbsp;{t.cardsSelected}
      </b>
    </Box>
  );
}

function getSelectedCards(
  mode: FlashCardMode,
  shuffle: boolean,
  sectionCounts: {
    sectionTitle: string;
    totalCount: number;
    selectedCards: CardsWithSmileys[];
  }[],
  selectedSections: string[]
): CardsWithSmileys[] {
  const selected = sectionCounts
    .filter((chap) => selectedSections.includes(chap.sectionTitle))
    .map((v) => v.selectedCards)
    .flat(1);
  if (shuffle && mode === FlashCardMode.DRILL_MODE) {
    return stableShuffle(selected);
  }
  return selected;
}

export function DrillConfigurator({ courseId }: { courseId: string }) {
  const router = useRouter();
  const { home, flashCards: t } = getLocaleObject(router);

  const [isLoading, setIsLoading] = useState(false);
  const [courseCards, setCourseCards] = useState<CardsWithSmileys[] | undefined>(undefined);

  const [levels, setLevels] = useState<ConfiguredLevel>({
    Remember: 0,
    Understand: 0,
  });
  const [checkedChapterIdxs, setCheckedChapterIdxs] = useState<number[]>([]);
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState(FlashCardMode.REVISION_MODE);
  const [shuffle, setShuffle] = useState(true);

  const { loggedIn } = useIsLoggedIn();

  const sectionCounts = getSectionCounts(levels, loggedIn, courseCards);
  const selectedChapters = checkedChapterIdxs.map((idx) => sectionCounts[idx].sectionTitle);
  const selectedCards = getSelectedCards(mode, shuffle, sectionCounts, selectedChapters);

  useEffect(() => {
    if (!courseId) return;
    setIsLoading(true);
    axios
      .get(`/api/get-cards-with-smileys/${courseId}`)
      .then((r) => {
        setIsLoading(false);
        setCourseCards(r.data);
      })
      .catch((e) => {
        if (e.response.status === 404) router.push('/');
      });
  }, [courseId, router]);

  if (isLoading) return <CircularProgress />;

  if (started) {
    return (
      <FlashCards
        mode={mode}
        cards={selectedCards.map((card) => ({
          conceptUri: card.conceptUri,
          definitionUri: card.definitionUri,
        }))}
        onFinish={() => setStarted(false)}
      />
    );
  }

  return (
    <Box m="15px auto 0" maxWidth="800px">
      <Typography variant="h5" sx={{ textAlign: 'center', mb: '10px' }}>
        {t.header}
      </Typography>
      <Typography variant="body2" sx={{ color: '#777', px: '10px' }}>
        {home.cardIntro}
      </Typography>
      <br />
      <Box
        display="flex"
        gap="10px"
        flexWrap="wrap"
        justifyContent="center"
        flexDirection="row-reverse"
      >
        <Box zIndex={1} maxWidth="250px">
          {loggedIn && <LevelConfigurator levels={levels} setLevels={setLevels} />}
          <ReviseAndDrillButtons
            shuffle={shuffle}
            setShuffle={setShuffle}
            selectedCards={selectedCards}
            start={(mode) => {
              setMode(mode);
              setStarted(true);
              Window?.scrollTo(0, FLASH_CARD_SCROLL_Y);
            }}
          />
        </Box>
        <Box flex="1 1 400px" maxWidth="600px">
          <CoverageConfigurator
            sectionCounts={sectionCounts}
            checkedChapterIdxs={checkedChapterIdxs}
            setCheckedChapterIdxs={setCheckedChapterIdxs}
            shuffle={shuffle}
            startSingleChapter={(idx, mode) => {
              setCheckedChapterIdxs([idx]);
              setMode(mode);
              setStarted(true);
              Window?.scrollTo(0, FLASH_CARD_SCROLL_Y);
            }}
          />
        </Box>
      </Box>
      {/*<ReviseAndDrillButtons
        shuffle={shuffle}
        setShuffle={setShuffle}
        selectedCards={selectedCards}
        start={(mode) => {
          setMode(mode);
          setStarted(true);
          Window?.scrollTo(0, FLASH_CARD_SCROLL_Y);
        }}
      /> 
      Not useful if there is no list of chapters*/}
    </Box>
  );
}
