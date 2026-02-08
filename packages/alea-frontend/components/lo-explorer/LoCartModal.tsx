import { HelpOutline } from '@mui/icons-material';
import ArticleIcon from '@mui/icons-material/Article';
import CancelIcon from '@mui/icons-material/Cancel';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { LoType } from '@alea/spec';
import Image from 'next/image';
import React, { useState } from 'react';
import { DetailsPanel, handleStexCopy, UrlNameExtractor } from '../LoListDisplay';
import LoQuizModal from './LoQuizModal';

const IconDisplayComponent: React.FC<{ uriType: LoType }> = ({ uriType }) => {
  switch (uriType) {
    case 'problem':
      return (
        <Image
          src="/practice_problems.svg"
          width={34}
          height={34}
          alt=""
          style={{
            filter:
              'invert(16%) sepia(17%) saturate(3640%) hue-rotate(193deg) brightness(94%) contrast(90%)',
          }}
        />
      );
    case 'definition':
      return <ArticleIcon sx={{ fontSize: '2rem', color: '#00bcd4' }} />;

    case 'example':
      return <DeviceHubIcon sx={{ fontSize: '2rem', color: 'success.light' }} />;

    default:
      return <HelpOutline sx={{ fontSize: '2rem', color: 'error.main' }} />;
  }
};

export interface CartItem {
  uri: string;
  uriType: LoType;
}

interface LoCartModalProps {
  showCart: boolean;
  setShowCart: React.Dispatch<React.SetStateAction<boolean>>;
  cart: CartItem[];
  handleRemoveFromCart: (uri: string, uriType: string) => void;
}

const LoCartModal: React.FC<LoCartModalProps> = ({
  showCart,
  setShowCart,
  cart,
  handleRemoveFromCart,
}) => {
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [selectedItems, setSelectedItems] = useState<CartItem[]>([]);
  const [displayedItem, setDisplayedItem] = useState<CartItem | undefined>(undefined);

  const toggleItemsSelection = (uri: string, uriType: LoType) => {
    setSelectedItems((prevSelected) => {
      const isItemSelected = prevSelected.some(
        (item) => item.uri === uri && item.uriType === uriType
      );

      if (isItemSelected) {
        return prevSelected.filter((item) => !(item.uri === uri && item.uriType === uriType));
      } else {
        return [...prevSelected, { uri, uriType }];
      }
    });
  };

  return (
    <>
      <Dialog open={showCart} onClose={() => setShowCart(false)} maxWidth="xl">
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" gap={5} alignItems="center">
            <Typography variant="h6" color="primary" fontWeight="bold">
              Cart Items
            </Typography>

            <Box sx={{ display: 'flex' }}>
              <IconButton onClick={() => setShowCart(false)}>
                <CancelIcon sx={{ color: 'error.main' }} />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" gap={1}>
            <Box flex="1 1 200px" maxWidth="400px">
              {!cart?.length && <Typography>No items in the cart.</Typography>}
              {(cart || []).map((item, idx) => (
                <Paper
                  key={idx}
                  elevation={2}
                  sx={{
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    cursor: 'pointer',

                    ...(displayedItem?.uri === item.uri && {
                      backgroundColor: 'rgba(200, 225, 255, 0.9)',
                    }),
                  }}
                >
                  <Checkbox
                    checked={selectedItems.some(
                      (selectedItem) =>
                        selectedItem.uri === item.uri && selectedItem.uriType === item.uriType
                    )}
                    disabled={!(item.uriType === 'problem')}
                    onChange={() => toggleItemsSelection(item.uri, item.uriType)}
                    color="primary"
                  />
                  <IconDisplayComponent uriType={item.uriType} />
                  <Typography
                    sx={{
                      ml: '4px',
                      fontWeight: 'normal',
                      fontSize: '0.75rem',
                      flex: 1,
                      wordBreak: 'break-word',
                      cursor: 'pointer',
                      '&:hover': {
                        color: 'blue.sky',
                      },
                    }}
                    onClick={() => setDisplayedItem(item)}
                  >
                    <UrlNameExtractor url={item.uri} />
                  </Typography>
                  <Tooltip title="Copy as STeX" arrow>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleStexCopy(item.uri, item.uriType)}
                      sx={{ mr: '8px' }}
                    >
                      <ContentCopyIcon />
                    </IconButton>
                  </Tooltip>

                  <IconButton
                    color="secondary"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (displayedItem?.uri === item.uri) {
                        setDisplayedItem(undefined);
                      }
                      handleRemoveFromCart(item.uri, item.uriType);
                    }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Paper>
              ))}
            </Box>

            {displayedItem && (
              <Box
                sx={{
                  flex: '1 1 200px',
                  p: 2,
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  boxShadow: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  overflowY: 'auto',
                }}
              >
                <DetailsPanel uriType={displayedItem.uriType} selectedUri={displayedItem.uri} />
              </Box>
            )}
          </Box>
        </DialogContent>
        {selectedItems.some((i) => i.uriType === 'problem') && (
          <DialogActions>
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                sx={{ mt: '16px' }}
                onClick={() => setShowQuizModal(true)}
              >
                Create Quiz
              </Button>
            </Box>
          </DialogActions>
        )}
      </Dialog>

      <LoQuizModal
        open={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        selectedItems={selectedItems}
      />
    </>
  );
};

export default LoCartModal;
