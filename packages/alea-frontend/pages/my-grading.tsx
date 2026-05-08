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
import { useCurrentUser } from '@alea/react-utils';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { PeerReviewGradedItemDisplay } from '../components/peer-review/PeerReviewGradedItemDisplay';
import MainLayout from '../layouts/MainLayout';

function plainTextFromHtml(html: string | undefined) {
  return String(html ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function GradedItemsList({
  gradedItems,
  selectedId,
  onSelectItem,
}: {
  gradedItems: GradingWithAnswer[];
  selectedId?: number;
  onSelectItem: (answerId: number) => void;
}) {
  if (gradedItems.length === 0) {
    return (
      <Box sx={gradingListStyles.empty}>
        <Typography color="text.secondary">No graded items found.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={gradingListStyles.root}>
      <List disablePadding>
        {gradedItems.map(({ questionTitle, courseId, courseInstance, customFeedback, id }, idx) => {
          const isSelected = selectedId === id;
          const titleText = plainTextFromHtml(questionTitle) || `Grading #${id}`;
          const feedbackText = plainTextFromHtml(customFeedback) || 'No written feedback';
          return (
            <ListItemButton
              key={`${questionTitle}-${id}-${idx}`}
              selected={isSelected}
              onClick={() => onSelectItem(id)}
              sx={[gradingListStyles.item, isSelected && gradingListStyles.selectedItem]}
            >
              <ListItemText
                disableTypography
                sx={gradingListStyles.itemText}
                primary={<Typography variant="subtitle2">{titleText}</Typography>}
                secondary={
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={gradingListStyles.feedbackPreview}
                    >
                      {feedbackText}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={gradingListStyles.meta}>
                      {courseId ? <Chip size="small" label={courseId} /> : null}
                      {courseInstance ? <Chip size="small" label={courseInstance} /> : null}
                    </Stack>
                  </Box>
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
  const [selected, setSelected] = useState<{ gradedId: number } | undefined>(undefined);
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
      deleteGraded(id).then(() => {
        getMyGraded().then((g) => {
          setGradingItems(g);
        });
        setSelected(undefined);
      });
    }
  };
  const selectedGrade = selected
    ? gradingItems.find((item) => item.id === selected.gradedId)
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
            gradedItems={gradingItems}
            selectedId={selected?.gradedId}
            onSelectItem={(gradedId) => setSelected({ gradedId })}
          />
        </Box>
        <Box sx={pageStyles.details}>
          {selectedGrade ? (
            <PeerReviewGradedItemDisplay grade={selectedGrade} onDelete={onDelete} />
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
  feedbackPreview: {
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: 2,
    overflow: 'hidden',
    mt: 0.25,
  },
  meta: {
    mt: 0.75,
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
    width: { xs: '100%', md: 340 },
    maxWidth: { xs: '100%', md: 340 },
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
