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
import { QuestionCategory } from './SectionDetailsDialog';

interface QuestionCategorySelectorProps {
  categories: QuestionCategory[];
  selectedCategories: string[];
  onToggleAll: () => void;
  onSelectCategory: (categoryId: string) => void;
}

export const QuestionCategorySelector: React.FC<QuestionCategorySelectorProps> = ({
  categories,
  selectedCategories,
  onToggleAll,
  onSelectCategory,
}) => {
  const allSelected = selectedCategories.length === categories.length;
  const someSelected =
    selectedCategories.length > 0 && selectedCategories.length < categories.length;

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
      <Box sx={{ bgcolor: 'secondary.light', color: 'secondary.contrastText', p: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Question Categories ({selectedCategories.length})
        </Typography>
      </Box>
      <Divider />

      <List dense sx={{ flex: 1, overflowY: 'auto', maxHeight: '100%' }}>
        <ListItem>
          <ListItemIcon>
            <Checkbox
              indeterminate={someSelected}
              checked={allSelected}
              onChange={onToggleAll}
              color="secondary"
            />
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" fontWeight="bold">
                Select All Categories ({categories.length})
              </Typography>
            }
          />
        </ListItem>
        <Divider />

        {categories.map((cat) => (
          <ListItem key={cat.id} disablePadding>
            <ListItemButton
              onClick={() => onSelectCategory(cat.id)}
              sx={{
                bgcolor: selectedCategories.includes(cat.id) ? 'secondary.light' : 'transparent',
                '&:hover': {
                  bgcolor: selectedCategories.includes(cat.id) ? 'secondary.main' : 'action.hover',
                },
              }}
            >
              <ListItemIcon>
                <Checkbox checked={selectedCategories.includes(cat.id)} color="secondary" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    fontWeight={selectedCategories.includes(cat.id) ? 'bold' : 'normal'}
                    color={
                      selectedCategories.includes(cat.id) ? 'secondary.contrastText' : 'inherit'
                    }
                  >
                    {cat.label}
                  </Typography>
                }
                secondary={
                  <Typography
                    variant="caption"
                    color={
                      selectedCategories.includes(cat.id)
                        ? 'secondary.contrastText'
                        : 'text.secondary'
                    }
                  >
                    {cat.description}
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
