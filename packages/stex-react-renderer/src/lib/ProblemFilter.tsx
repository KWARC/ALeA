import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import FilterList from '@mui/icons-material/FilterList';
import { useEffect, useState } from 'react';
import { getProblemType } from './PerSectionQuiz';
import { useRouter } from 'next/router';
import { getLocaleObject } from './lang/utils';

export type FilterType = 'all' | 'quiz' | 'homework' | 'exam' | 'uncategorized';

interface ProblemFilterProps {
  allProblemUris: string[];
  problems: { problemId: string; examRefs?: any[] }[];
  onApply: (filtered: string[], type: FilterType) => void;
}

export function ProblemFilter({ allProblemUris, problems, onApply }: ProblemFilterProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [filteredProblems, setFilteredProblems] = useState<string[]>(allProblemUris);
  const [tempFilters, setTempFilters] = useState({
    quiz: true,
    homework: true,
    exam: true,
    uncategorized: true,
  });
  const [filterType, setFilterType] = useState<FilterType>('all');
  const t = getLocaleObject(useRouter()).problemFilter;

  const isExamProblem = (uri: string) =>
    problems.find((p) => p.problemId === uri)?.examRefs?.length;

  useEffect(() => {
    setFilteredProblems(allProblemUris);
    setFilterType('all');
    setTempFilters({
      quiz: true,
      homework: true,
      exam: true,
      uncategorized: true,
    });
  }, [allProblemUris]);

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleFilterChange =
    (filterName: keyof typeof tempFilters) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setTempFilters((prev) => ({
        ...prev,
        [filterName]: event.target.checked,
      }));
    };

  const applyFilters = () => {
    const activeTypes = Object.entries(tempFilters)
      .filter(([_, val]) => val)
      .map(([key]) => key as FilterType);

    const filtered = allProblemUris.filter((uri) => {
      if (activeTypes.includes('exam') && isExamProblem(uri)) return true;

      const type = getProblemType(uri);
      return activeTypes.includes(type);
    });

    const newType: FilterType = activeTypes.length === 1 ? activeTypes[0] : 'all';
    setFilterType(newType);
    setFilteredProblems(filtered);
    onApply(filtered, newType);
    handleFilterClose();
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Tooltip title={t.filterProblems}>
        <IconButton onClick={handleFilterClick}>
          <FilterList />
        </IconButton>
      </Tooltip>

      <Typography variant="body2" sx={{ ml: 1 }}>
        {filterType === 'all' ? t.showingAll : t.showingType.replace('$1', t[filterType])}
      </Typography>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: 250 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t.filterTitle}
          </Typography>

          {(['quiz', 'homework', 'exam', 'uncategorized'] as const).map((type) => {
            const count =
              type === 'exam'
                ? problems.filter((p) => p.examRefs?.length).length
                : allProblemUris.filter((uri) => getProblemType(uri) === type).length;

            return (
              <FormControlLabel
                key={type}
                control={
                  <Checkbox
                    checked={tempFilters[type]}
                    onChange={handleFilterChange(type)}
                    size="small"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>{t[type]}</span>
                    <Typography variant="caption" color="text.secondary">
                      ({count})
                    </Typography>
                  </Box>
                }
              />
            );
          })}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button size="small" onClick={handleFilterClose}>
              {t.cancel}
            </Button>
            <Button size="small" variant="contained" onClick={applyFilters}>
              {t.apply}
            </Button>
          </Box>
        </Box>
      </Popover>
    </Box>
  );
}
