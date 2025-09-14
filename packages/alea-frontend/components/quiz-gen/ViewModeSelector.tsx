import { Box, Button, CircularProgress } from '@mui/material';
import { PRIMARY_COL } from '@alea/utils';

export type QuizViewMode = 'all' | 'generated' | 'existing';
export function ViewModeSelector({
  viewMode,
  setViewMode,
  loading,
}: {
  viewMode: QuizViewMode;
  setViewMode: (mode: QuizViewMode) => void;
  loading: boolean;
}) {
  return (
    <Box display="flex" gap={2} my={1} position="relative">
      {(['all', 'generated', 'existing'] as QuizViewMode[]).map((mode) => (
        <Button
          key={mode}
          variant={viewMode === mode ? 'contained' : 'outlined'}
          color="primary"
          onClick={() => setViewMode(mode)}
          sx={{
            fontWeight: 500,
            borderRadius: 2,
            px: 3,
            py: 1,
            opacity: loading ? 0.6 : 1,
            position: 'relative',
          }}
        >
          {loading && (
            <CircularProgress
              size={20}
              sx={{
                color: viewMode === mode ? 'white' : PRIMARY_COL,
                position: 'absolute',
                top: '30%',
                left: '42%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          )}
          {mode === 'all'
            ? 'All'
            : mode === 'generated'
            ? 'Generated Problems'
            : 'Existing Problems'}
        </Button>
      ))}
    </Box>
  );
}
