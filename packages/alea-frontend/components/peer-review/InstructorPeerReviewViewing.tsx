import { Box, Button, IconButton, List, ListItemButton, ListItemText } from '@mui/material';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { MultiItemSelector } from '../nap/MultiItemsSelector';
import { deleteReview, getReviewItems, GradingWithAnswer } from '@stex-react/spec';
import { SettingsBackupRestore } from '@mui/icons-material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import { truncateText } from '@stex-react/utils';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { PeerReviewGradedItemDisplay } from './PeerReviewGradedItemDisplay';
import { SafeHtml } from '@stex-react/react-utils';

const MULTI_SELECT_FIELDS = ['questionId', 'checkerId'] as const;
const ALL_SORT_FIELDS = ['questionTitle', 'updatedAt', 'checkerId'] as const;
type MultSelectField = (typeof MULTI_SELECT_FIELDS)[number];
type SortField = (typeof ALL_SORT_FIELDS)[number];
const DEFAULT_SORT_ORDER: Record<SortField, 'ASC' | 'DESC'> = {
  questionTitle: 'ASC',
  checkerId: 'ASC',
  updatedAt: 'ASC',
};
export default function InstructorPeerReviewViewing({ courseId }: { courseId: string }) {
  const [reviewItems, setReviewItems] = useState<GradingWithAnswer[]>([]);
  const [selected, setSelected] = useState<{ id: number } | undefined>(undefined);
  const [sortAndFilterParams, setSortAndFilterParams] = useState<SortAndFilterParams>({
    multiSelectField: {
      questionId: [],
      checkerId: [],
    },
    sortingFields: [...ALL_SORT_FIELDS],
    sortOrders: DEFAULT_SORT_ORDER,
  });
  useEffect(() => {
    getReviewItems(courseId).then((items: GradingWithAnswer[]) => setReviewItems(items));
  }, [courseId]);
  const selectedReviewItems = useMemo(
    () => getSeletectedPeerReviewItems(reviewItems, sortAndFilterParams),
    [reviewItems, sortAndFilterParams]
  );
  const onDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this grade?')) {
      deleteReview(id,courseId).then(() => {
        getReviewItems(courseId).then((items) => setReviewItems(items));
      });
      setSelected(undefined);
    }
  };
  return (
    <Box>
      <PeerReviewItemOrganizer
        peerReviews={reviewItems}
        sortAndFilterParams={sortAndFilterParams}
        setSortAndFilterParams={setSortAndFilterParams}
      />
      <Box display="flex" mt={1} flexWrap="wrap" rowGap={0.5}>
        <Box sx={{ border: '1px solid #ccc' }} flex="1 1 200px" maxWidth={300}>
          <PeerReviewItemsList
            peerReviews={selectedReviewItems}
            onSelectItem={(id) => setSelected({ id })}
          />
        </Box>
        <Box border="1px solid #ccc" flex="1 1 400px" p={2} maxWidth="fill-available">
          {selected ? (
            <PeerReviewGradedItemDisplay
              grade={reviewItems.find((grade) => grade.id == selected.id)}
              onDelete={onDelete}
            ></PeerReviewGradedItemDisplay>
          ) : (
            <i>Please click on a grading item on the left.</i>
          )}
        </Box>
      </Box>
    </Box>
  );
}
function getSeletectedPeerReviewItems(
  answerItems: GradingWithAnswer[],
  params: SortAndFilterParams
) {
  function getValue(item: GradingWithAnswer, field: SortField) {
    if (field === 'questionTitle') return item.questionTitle;
    if (field === 'updatedAt') return item.updatedAt;
    if (field === 'checkerId') return item.checkerId;
  }
  return answerItems
    .filter((item) => {
      for (const field of MULTI_SELECT_FIELDS) {
        if (
          params.multiSelectField[field].length > 0 &&
          !params.multiSelectField[field].includes(item[field])
        ) {
          return false;
        }
        return true;
      }
    })
    .sort((a, b) => {
      for (const f of params.sortingFields) {
        const order = params.sortOrders[f] === 'ASC' ? 1 : -1;
        const aVal = getValue(a, f);
        const bVal = getValue(b, f);
        if (aVal < bVal || (!aVal && bVal)) return -1 * order;
        if (aVal > bVal || (aVal && !bVal)) return 1 * order;
      }
      return 0;
    });
}
function PeerReviewItemsList({
  peerReviews,
  onSelectItem,
}: {
  peerReviews: GradingWithAnswer[];
  onSelectItem: (reviewId: number) => void;
}) {
  dayjs.extend(relativeTime);
  return (
    <Box maxHeight="50vh" overflow="scroll">
      <List disablePadding>
        {peerReviews.map(
          ({ checkerId, questionId, questionTitle, updatedAt, id, customFeedback }, idx) => (
            <ListItemButton
              key={`${idx}-${questionId}-${checkerId}`}
              onClick={(e) => onSelectItem(id)}
              sx={{ py: 0, bgcolor: idx % 2 === 0 ? '#f0f0f0' : '#ffffff' }}
            >
              <ListItemText
                primary={customFeedback ? truncateText(customFeedback, 50) : 'No feedback'}
                secondary={
                  <>
                    <SafeHtml html={questionTitle} /> &nbsp;{`(${checkerId})`} &nbsp;
                    <span>{dayjs(updatedAt).fromNow()}</span>
                  </>
                }
              />
            </ListItemButton>
          )
        )}
      </List>
    </Box>
  );
}
function PeerReviewItemOrganizer({
  sortAndFilterParams,
  setSortAndFilterParams,
  peerReviews,
}: {
  sortAndFilterParams: SortAndFilterParams;
  setSortAndFilterParams: Dispatch<SetStateAction<SortAndFilterParams>>;
  peerReviews: GradingWithAnswer[];
}) {
  const allCheckerIds = useMemo(
    () => [...new Set(peerReviews.map((c) => c.checkerId))].map((i) => ({ value: i, title: i })),
    [peerReviews]
  );
  const allQuestions = useMemo(
    () =>
      [...new Set(peerReviews.map((c) => c.questionTitle))].map((i) => ({ value: i, title: i })),
    [peerReviews]
  );
  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap={2}>
        <MultiItemSelector
          label="Checkers"
          selectedValues={sortAndFilterParams.multiSelectField.checkerId}
          allValues={allCheckerIds}
          onUpdate={(homeworkId) =>
            setSortAndFilterParams((prev) => ({
              ...prev,
              multiSelectField: { ...prev.multiSelectField, homeworkId },
            }))
          }
        />
        <MultiItemSelector
          label="Questions"
          selectedValues={sortAndFilterParams.multiSelectField.questionId}
          allValues={allQuestions}
          onUpdate={(questionId) =>
            setSortAndFilterParams((prev) => ({
              ...prev,
              multiSelectField: { ...prev.multiSelectField, questionId },
            }))
          }
        />
      </Box>
      <PeerReviewListSortFields
        sortAndFilterParams={sortAndFilterParams}
        setSortAndFilterParams={setSortAndFilterParams}
      />
    </Box>
  );
}
function PeerReviewListSortFields({
  sortAndFilterParams,
  setSortAndFilterParams,
}: {
  sortAndFilterParams: SortAndFilterParams;
  setSortAndFilterParams: Dispatch<SetStateAction<SortAndFilterParams>>;
}) {
  const { sortingFields, sortOrders } = sortAndFilterParams;
  return (
    <Box display="flex" rowGap={1} columnGap={2} alignItems="center" flexWrap="wrap">
      Sort:
      {sortingFields.map((item) => (
        <Button
          key={item}
          variant="outlined"
          onClick={(e) => {
            e.stopPropagation();
            setSortAndFilterParams((prev) => ({
              ...prev,
              sortingFields: [item, ...prev.sortingFields.filter((f) => f !== item)],
            }));
          }}
          sx={{ py: 0 }}
        >
          {item}&nbsp;
          <IconButton
            onClick={(e) => {
              e.stopPropagation();

              setSortAndFilterParams((prev) => ({
                ...prev,
                sortOrders: {
                  ...prev.sortOrders,
                  [item]: sortOrders[item] === 'ASC' ? 'DESC' : 'ASC',
                },
              }));
            }}
          >
            {sortOrders[item] === 'ASC' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </Button>
      ))}
      <IconButton
        onClick={() => {
          setSortAndFilterParams((prev) => ({
            ...prev,
            sortingFields: [...ALL_SORT_FIELDS],
            sortOrders: DEFAULT_SORT_ORDER,
          }));
        }}
      >
        <SettingsBackupRestore />
      </IconButton>
    </Box>
  );
}
interface SortAndFilterParams {
  multiSelectField: Record<MultSelectField, (string | number)[]>;
  sortingFields: SortField[];
  sortOrders: Record<SortField, 'ASC' | 'DESC'>;
}
