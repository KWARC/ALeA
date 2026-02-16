import { SafeFTMLFragment } from '@alea/stex-react-renderer';
import { Book, MicExternalOn, Quiz, SupervisedUserCircle } from '@mui/icons-material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import SchoolIcon from '@mui/icons-material/School';
import {
  alpha,
  Box,
  IconButton,
  Paper,
  SxProps,
  TextField,
  Theme,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { LoType } from '@alea/spec';
import { UriProblemViewer } from '@alea/stex-react-renderer';
import { capitalizeFirstLetter, getAdaptiveColor, getParamsFromUri } from '@alea/utils';
import React, { memo, useState } from 'react';
import { CartItem } from './lo-explorer/LoCartModal';
import LoRelations from './lo-explorer/LoRelations';
import { LoReverseRelations } from './lo-explorer/LoReverseRelation';
import { bgcolor } from '@mui/system';

interface UrlData {
  projectName: string;
  topic: string;
  fileName?: string;
  icon?: React.ReactElement;
}

export function getUrlInfo(url: string): UrlData {
  const [archiveRaw, filePathRaw, topicRaw] = getParamsFromUri(url, ['a', 'p', 'd']);
  const archive = archiveRaw || 'Unknown Archive';
  const filePath = filePathRaw || 'Unknown File';
  const topic = topicRaw || 'Unknown Topic';
  let icon = null;
  let projectName = 'Unknown Archive';
  const projectParts = archive.split('/');
  const fileParts = filePath.split('/');
  const fileName = fileParts[0];
  if (archive.startsWith('courses/')) {
    projectName = `${projectParts[1]}/${projectParts[2]}`;
    icon = <SchoolIcon sx={{ color: 'text.primary', fontSize: '18px' }} />;
  } else if (archive.startsWith('problems/')) {
    projectName = projectParts[1];
    icon = <Quiz sx={{ color: 'text.primary', fontSize: '18px' }} />;
  } else if (archive.startsWith('KwarcMH/')) {
    projectName = projectParts[0];
    icon = <SchoolIcon sx={{ color: 'text.primary', fontSize: '18px' }} />;
  } else if (archive.startsWith('smglom/')) {
    projectName = projectParts[0];
    icon = <Book sx={{ color: 'text.primary', fontSize: '18px' }} />;
  } else if (archive.startsWith('mkohlhase/')) {
    projectName = projectParts[0];
    icon = <SupervisedUserCircle sx={{ color: 'text.primary', fontSize: '18px' }} />;
  } else if (archive.startsWith('talks/')) {
    projectName = projectParts[0];
    icon = <MicExternalOn sx={{ color: 'text.primary', fontSize: '18px' }} />;
  }

  return { projectName, topic, fileName, icon };
}

export const handleStexCopy = (uri: string, uriType: LoType) => {
  const [archiveRaw, filePathRaw] = getParamsFromUri(uri, ['a', 'p']);
  const archive = archiveRaw || 'Unknown Archive';
  const filePath = filePathRaw || 'Unknown File';
  let stexSource = '';
  switch (uriType) {
    case 'problem':
      stexSource = `\\includeproblem[pts=TODO,archive=${archive}]{${filePath}}`;
      break;
    case 'definition':
    case 'example':
    case 'para':
    case 'statement':
      stexSource = `\\include${uriType}[archive=${archive}]{${filePath}}`;
      break;
    default:
      break;
  }

  if (stexSource) navigator.clipboard.writeText(stexSource);
};

export function UrlNameExtractor({ url }: { url: string }) {
  const { projectName, topic, fileName, icon } = getUrlInfo(url);
  const isValidProject = projectName && projectName !== 'Unknown Archive';
  const isValidFile = fileName && fileName !== 'Unknown File';
  if (!isValidProject) {
    return <Box>{url}</Box>;
  }
  return (
    <Box display="flex" flexWrap="wrap" sx={{ gap: '5px' }}>
      {projectName}
      {icon && icon}
      {isValidFile && <span>{fileName}</span>}
      {topic}
    </Box>
  );
}

export const LoViewer: React.FC<{ uri: string; uriType: LoType }> = ({ uri, uriType }) => {
  return (
    <Box
      sx={{
        padding: 2,
        border: '1px solid ',
        borderColor: 'divider',
        borderRadius: 4,
        bgcolor: 'background.paper',
      }}
    >
      {uri ? (
        <SafeFTMLFragment key={uri} fragment={{ type: 'FromBackend', uri: uri }} />
      ) : (
        <Typography>No {uriType} found.</Typography>
      )}
    </Box>
  );
};

interface DetailsPanelProps {
  uriType: LoType;
  selectedUri: string | null;
  displayReverseRelation?: (conceptUri: string) => void;
}

export const DetailsPanel: React.FC<DetailsPanelProps> = memo(
  ({ uriType, selectedUri, displayReverseRelation }) => {
    const theme = useTheme();
    const bgDefault = theme.palette.background.default;
    return (
      <Box
        sx={{
          ...detailsPanelStyles.container,
          bgcolor: getAdaptiveColor('#f0fff0e6', bgDefault),
        }}
      >
        <Typography color="secondary" variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          <Tooltip title={selectedUri} arrow placement="top">
            <span style={{ wordBreak: 'break-word' }}>{`${(uriType || '').toUpperCase()}: ${
              selectedUri || 'None'
            }`}</span>
          </Tooltip>
        </Typography>
        <LoRelations uri={selectedUri} displayReverseRelation={displayReverseRelation} />
        {!!selectedUri &&
          (uriType === 'problem' ? (
            <UriProblemViewer uri={selectedUri} isSubmitted={true} />
          ) : (
            <LoViewer uri={selectedUri} uriType={uriType} />
          ))}
      </Box>
    );
  }
);
DetailsPanel.displayName = 'DetailsPanel';

const LoListDisplay = ({
  uris,
  selectedUri,
  cart,
  loType,
  setSelectedUri,
  handleAddToCart,
  handleRemoveFromCart,
}: {
  uris: string[];
  selectedUri: string;
  cart: CartItem[];
  loType: LoType;
  setSelectedUri: React.Dispatch<React.SetStateAction<string>>;
  handleAddToCart: (uri: string, uriType: string) => void;
  handleRemoveFromCart: (uri: string, uriType: string) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showReverseRelation, setShowReverseRelation] = useState(false);
  const [reverseRelationConcept, setReverseRelationConcept] = useState<string>('');
  const theme = useTheme();
  const bgDefault = theme.palette.background.default;
  const displayReverseRelation = (conceptUri: string) => {
    setShowReverseRelation((prevState) => !prevState);
    setReverseRelationConcept(conceptUri);
  };

  const filteredUris = uris.filter((uri) => {
    const { projectName, topic, fileName } = getUrlInfo(uri);
    const searchTerms = searchQuery.toLowerCase().split(/\s+/);
    return searchTerms.every(
      (term) =>
        projectName.toLowerCase().includes(term) ||
        topic.toLowerCase().includes(term) ||
        fileName.toLowerCase().includes(term)
    );
  });
  return (
    <Box sx={loListStyles.pageContainer}>
      {showReverseRelation && (
        <LoReverseRelations
          concept={reverseRelationConcept}
          cart={cart}
          handleAddToCart={handleAddToCart}
          handleRemoveFromCart={handleRemoveFromCart}
          openDialog={showReverseRelation}
          handleCloseDialog={() => setShowReverseRelation(false)}
        />
      )}
      <Box sx={{ ...loListStyles.listPanel, bgcolor: getAdaptiveColor('#f0f0ffe6', bgDefault) }}>
        <Box sx={loListStyles.listHeader}>
          <Typography variant="h6" color="primary">
            {filteredUris.length} {capitalizeFirstLetter(loType)}s
          </Typography>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            sx={{
              minWidth: '150px',
            }}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>

        {filteredUris.map((uri, index) => {
          const isInCart = cart.some((item) => item.uri === uri && item.uriType === loType);
          const isSelected = selectedUri === uri;
          return (
            <Paper
              key={index}
              elevation={3}
              sx={{
                ...loListStyles.listItem,
                background: isInCart ? getAdaptiveColor('#dcffdce6', bgDefault) : 'bacground.card',
              }}
            >
              <Tooltip title={uri} arrow placement="right-start">
                <Typography
                  sx={{
                    ...loListStyles.uriText,
                    color: isSelected ? getAdaptiveColor('#096dd9', bgDefault) : 'text.primary',
                    fontWeight: isSelected ? 'bold' : 'normal',
                  }}
                  onClick={() => setSelectedUri(uri)}
                >
                  <UrlNameExtractor url={uri} />
                </Typography>
              </Tooltip>

              <Tooltip title="Copy as STeX" arrow>
                <IconButton
                  color="primary"
                  size="small"
                  onClick={() => handleStexCopy(uri, loType)}
                  sx={{
                    marginRight: '8px',
                  }}
                  disabled={!(loType === 'problem')}
                >
                  <ContentCopyIcon />
                </IconButton>
              </Tooltip>
              <IconButton
                color={isInCart ? 'secondary' : 'primary'}
                onClick={() =>
                  isInCart ? handleRemoveFromCart(uri, loType) : handleAddToCart(uri, loType)
                }
              >
                {isInCart ? <RemoveShoppingCartIcon /> : <AddShoppingCartIcon />}
              </IconButton>
            </Paper>
          );
        })}
      </Box>
      <DetailsPanel
        uriType={loType}
        selectedUri={selectedUri}
        displayReverseRelation={displayReverseRelation}
      />
    </Box>
  );
};

export default LoListDisplay;

const loListStyles: Record<string, SxProps<Theme>> = {
  pageContainer: {
    display: 'flex',
    gap: 2,
    mt: 2,
    flexWrap: 'wrap',
  },

  listPanel: {
    flex: 1,
    minWidth: 250,
    borderRadius: 2,
    p: 2,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.1)',
  },

  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 1,
    mb: 2,
    flexWrap: 'wrap',
  },

  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    p: 1.5,
    mb: 1,
    borderRadius: 2,
    '&:hover': {
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    },
  },

  uriText: {
    cursor: 'pointer',
    flex: 1,
    wordBreak: 'break-word',
    fontSize: '0.875rem',
    '&:hover': {
      color: alpha('#096dd9', 0.7),
    },
  },
};

const detailsPanelStyles: Record<string, SxProps<Theme>> = {
  container: {
    flex: 2,
    minWidth: 250,
    borderRadius: 2,
    p: 2,
    height: '90vh',
    overflowY: 'auto',
    boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.1)',
  },
};
