import { Alert, Box, Button, Modal, Snackbar, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { CartItem } from './LoCartModal';
import { getParamsFromUri } from '@alea/utils';

interface QuizModalProps {
  open: boolean;
  selectedItems: CartItem[];
  onClose: () => void;
}

const LoQuizModal: React.FC<QuizModalProps> = ({ open, onClose, selectedItems }) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const generatedQuizContent = useMemo(() => {
    const staticLines = [
      '\\documentclass{article}',
      '\\usepackage[notes,hints]{hwexam} % ,',
      '\\libinput{hwexam-preamble}',
      '\\title{TODO}',
      '\\begin{document}',
      '\\begin{assignment}[title={TODO},number=TODO,given=TODO,due=TODO]',
    ];
    const dynamicLines = selectedItems
      .filter((i) => i.uriType === 'problem')
      .map((item) => {
        const [archive, filePath] = getParamsFromUri(item.uri, ['a', 'p']);
        return `       \\includeproblem[pts=TODO,archive=${archive}]{${filePath}}`;
      })
      .join('\n');
    const closingLines = ['\\end{assignment}', '\\end{document}'];

    return `${staticLines.join('\n')}\n${dynamicLines}\n${closingLines.join('\n')}`;
  }, [selectedItems]);

  const handleCopyQuiz = () => {
    navigator.clipboard.writeText(generatedQuizContent);
    setSnackbarOpen(true);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Box
          sx={{
            background: 'white',
            borderRadius: '8px',
            padding: '16px',
            overflowX: 'auto',
            overflowY: 'auto',
            boxShadow: 24,
          }}
        >
          <Typography variant="h6" sx={{ marginBottom: '16px' }}>
            Quiz Content
          </Typography>
          <Box
            sx={{
              background: '#f9f9f9',
              border: '1px solid #ccc',
              borderRadius: '8px',
              padding: '8px',
              marginBottom: '16px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {generatedQuizContent}
          </Box>
          <Box display="flex" gap={2}>
            <Button variant="contained" onClick={handleCopyQuiz} disabled={!selectedItems?.length}>
              Copy Quiz Content
            </Button>
            <Button variant="contained" onClick={onClose}>
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          Quiz content copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
};

export default LoQuizModal;
