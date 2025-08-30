import {
    Box,
    Checkbox,
    Divider,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Paper,
    Typography,
} from '@mui/material';
import React from 'react';

interface QuestionType {
  id: string;
  label: string;
  description: string;
}

interface QuestionTypeSelectorProps {
  questionTypes: QuestionType[];
  selectedQuestionTypes: string[];
  onToggleAll: () => void;
  onSelectQuestionType: (questionTypeId: string) => void;
}

export const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({
  questionTypes,
  selectedQuestionTypes,
  onToggleAll,
  onSelectQuestionType,
}) => {
  const allSelected = selectedQuestionTypes.length === questionTypes.length;
  const someSelected =
    selectedQuestionTypes.length > 0 && selectedQuestionTypes.length < questionTypes.length;

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        mb: 2,
      }}
    >
      <Box sx={{ bgcolor: 'primary.light', color: 'primary.contrastText', p: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Question Types ({selectedQuestionTypes.length})
        </Typography>
      </Box>
      <Divider />

      <List
        dense
        sx={{
          flex: 1,
          overflowY: 'auto',
          maxHeight: '100%',
        }}
      >
        <ListItem>
          <ListItemIcon>
            <Checkbox
              indeterminate={someSelected}
              checked={allSelected}
              onChange={onToggleAll}
              color="primary"
            />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" fontWeight="bold">
                Select All Question Types ({questionTypes.length})
              </Typography>
            }
          />
        </ListItem>
        <Divider />

        {questionTypes.map((qt) => (
          <ListItem key={qt.id} disablePadding>
            <ListItemButton
              onClick={() => onSelectQuestionType(qt.id)}
              sx={{
                bgcolor: selectedQuestionTypes.includes(qt.id) ? 'primary.light' : 'transparent',
                '&:hover': {
                  bgcolor: selectedQuestionTypes.includes(qt.id) ? 'primary.main' : 'action.hover',
                },
              }}
            >
              <ListItemIcon>
                <Checkbox checked={selectedQuestionTypes.includes(qt.id)} color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    fontWeight={selectedQuestionTypes.includes(qt.id) ? 'bold' : 'normal'}
                    color={
                      selectedQuestionTypes.includes(qt.id) ? 'primary.contrastText' : 'inherit'
                    }
                  >
                    {qt.label}
                  </Typography>
                }
                secondary={
                  <Typography
                    variant="caption"
                    color={
                      selectedQuestionTypes.includes(qt.id)
                        ? 'primary.contrastText'
                        : 'text.secondary'
                    }
                    sx={{ opacity: selectedQuestionTypes.includes(qt.id) ? 0.9 : 1 }}
                  >
                    {qt.description}
                  </Typography>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};
