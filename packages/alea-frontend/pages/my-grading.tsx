import {
  Box,
  Chip,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { deleteGraded, getMyGraded, GradingWithAnswer } from '@alea/spec';
import { SafeHtml, useCurrentUser } from '@alea/react-utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { PeerReviewGradedItemDisplay } from '../components/peer-review/PeerReviewGradedItemDisplay';
import MainLayout from '../layouts/MainLayout';

interface FeedbackGroup {
  key: string;
  questionId: string;
  grades: GradingWithAnswer[];
  questionTitle: string;
  courseId: string;
  courseInstance: string;
}

function groupGradesByQuestion(items: GradingWithAnswer[]): FeedbackGroup[] {
  const map = new Map<string, FeedbackGroup>();
  for (const item of items) {
    const key = [
      item.questionId,
      item.studentId ?? `answer-${item.answerId}`,
      item.courseId,
      item.courseInstance,
    ].join('|');
    const existing = map.get(key);
    if (existing) {
      existing.grades.push(item);
    } else {
      map.set(key, {
        key,
        questionId: item.questionId,
        grades: [item],
        questionTitle: item.questionTitle,
        courseId: item.courseId,
        courseInstance: item.courseInstance,
      });
    }
  }

  for (const group of map.values()) {
    group.grades.sort((x, y) => {
      const xn = Number(x.subProblemId);
      const yn = Number(y.subProblemId);
      if (Number.isFinite(xn) && Number.isFinite(yn)) return xn - yn;
      return String(x.subProblemId).localeCompare(String(y.subProblemId));
    });
  }
  return Array.from(map.values());
}

function GradedItemsList({
  groups,
  selectedKey,
  onSelectItem,
}: {
  groups: FeedbackGroup[];
  selectedKey?: string;
  onSelectItem: (key: string) => void;
}) {
  if (groups.length === 0) {
    return (
      <Box sx={gradingListStyles.empty}>
        <Typography color="text.secondary">No graded items found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={gradingListStyles.root}>
      <List disablePadding>
        {groups.map((group, idx) => {
          const isSelected = selectedKey === group.key;
          return (
            <ListItemButton
              key={group.key}
              selected={isSelected}
              onClick={() => onSelectItem(group.key)}
              sx={[gradingListStyles.item, isSelected && gradingListStyles.selectedItem]}
            >
              <ListItemText
                disableTypography
                sx={gradingListStyles.itemText}
                primary={
                  <Box>
                    <Typography variant="subtitle2">{`Problem ${idx + 1}`}</Typography>
                    {group.questionTitle ? (
                      <Typography
                        variant="body2"
                        component="div"
                        sx={gradingListStyles.questionTitle}
                      >
                        <SafeHtml html={group.questionTitle} />
                      </Typography>
                    ) : null}
                  </Box>
                }
                secondary={
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={gradingListStyles.meta}>
                    <Chip size="small" label={`${group.grades.length} sub-problems`} />
                    {group.courseInstance ? (
                      <Chip size="small" label={group.courseInstance} />
                    ) : null}
                    {group.courseId ? <Chip size="small" label={group.courseId} /> : null}
                  </Stack>
                }
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
}

const MyGrading: NextPage = () => {
  const [gradingItems, setGradingItems] = useState<GradingWithAnswer[]>([]);
  const { user, isUserLoading } = useCurrentUser();
  const [selected, setSelected] = useState<{ key: string } | undefined>(undefined);
  const router = useRouter();
  useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    getMyGraded().then((g) => setGradingItems(g));
  }, [router, user, isUserLoading]);
  const onDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this grade?')) {
      deleteGraded(id)
        .then(() => getMyGraded())
        .then((g) => {
          setGradingItems(g);
          setSelected((current) => {
            if (!current) return undefined;
            const groups = groupGradesByQuestion(g);
            return groups.some((group) => group.key === current.key) ? current : undefined;
          });
        })
        .catch(() => {
          alert('Failed to delete grade. Please try again.');
        });
    }
  };
  const feedbackGroups = useMemo(() => groupGradesByQuestion(gradingItems), [gradingItems]);
  const selectedGroup = selected
    ? feedbackGroups.find((group) => group.key === selected.key)
    : undefined;

  return (
    <MainLayout title="My Grading">
      <Box sx={pageStyles.header}>
        <Box>
          <Typography variant="h5">My grading</Typography>
          <Typography color="text.secondary">
            Reviews you have submitted for open practice problems.
          </Typography>
        </Box>
        <Chip color="primary" variant="outlined" label={`${gradingItems.length} reviews`} />
      </Box>

      <Box sx={pageStyles.content}>
        <Box sx={pageStyles.sidebar}>
          <Box sx={pageStyles.sidebarHeader}>
            <Typography variant="subtitle2">Reviewed answers</Typography>
          </Box>
          <Divider />
          <GradedItemsList
            groups={feedbackGroups}
            selectedKey={selected?.key}
            onSelectItem={(key) => setSelected({ key })}
          />
        </Box>
        <Box sx={pageStyles.details}>
          {selectedGroup ? (
            <PeerReviewGradedItemDisplay grades={selectedGroup.grades} onDelete={onDelete} />
          ) : (
            <Box sx={pageStyles.emptyDetails}>
              <Typography variant="subtitle1">Select a reviewed answer</Typography>
              <Typography color="text.secondary">
                Pick an item from the list to inspect the problem, answer, and grading details.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </MainLayout>
  );
};

const gradingListStyles = {
  root: {
    maxHeight: '65vh',
    overflow: 'auto',
  },
  empty: {
    p: 2,
  },
  item: {
    alignItems: 'flex-start',
    py: 1.25,
    px: 1.5,
    borderBottom: 1,
    borderColor: 'divider',
    bgcolor: 'background.paper',
  },
  selectedItem: {
    bgcolor: 'action.selected',
    borderLeft: 3,
    borderLeftColor: 'primary.main',
    pl: 1.125,
    '&:hover': {
      bgcolor: 'action.hover',
    },
  },
  itemText: {
    my: 0,
  },
  questionTitle: {
    color: 'text.secondary',
    mt: 0.25,
  },
  meta: {
    mt: 0.75,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 0.5,
  },
} as const;

const pageStyles = {
  header: {
    display: 'flex',
    alignItems: { xs: 'flex-start', sm: 'center' },
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 1,
    mb: 1.5,
  },
  content: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    alignItems: 'stretch',
  },
  sidebar: {
    flexGrow: { xs: 1, md: 0 },
    flexShrink: 0,
    width: { xs: '100%', md: 320 },
    maxWidth: { xs: '100%', md: 320 },
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    overflow: 'hidden',
    bgcolor: 'background.paper',
  },
  sidebarHeader: {
    px: 1.5,
    py: 1,
    bgcolor: 'grey.50',
  },
  details: {
    flexGrow: 1,
    flexBasis: { xs: '100%', md: 0 },
    border: 1,
    borderColor: 'divider',
    borderRadius: 1,
    p: 2,
    bgcolor: 'background.paper',
    minWidth: 0,
  },
  emptyDetails: {
    minHeight: 240,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 0.5,
  },
} as const;

export default MyGrading;
