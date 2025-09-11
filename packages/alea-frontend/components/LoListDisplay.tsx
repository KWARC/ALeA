import { FTMLFragment } from '@kwarc/ftml-react';
import { Book, MicExternalOn, Quiz, SupervisedUserCircle } from '@mui/icons-material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RemoveShoppingCartIcon from '@mui/icons-material/RemoveShoppingCart';
import SchoolIcon from '@mui/icons-material/School';
import { alpha, Box, IconButton, Paper, TextField, Tooltip, Typography } from '@mui/material';
import { LoType } from '@stex-react/spec';
import { UriProblemViewer } from '@stex-react/stex-react-renderer';
import { capitalizeFirstLetter, getParamsFromUri } from '@stex-react/utils';
import { memo, useState } from 'react';
import { CartItem } from './lo-explorer/LoCartModal';
import LoRelations from './lo-explorer/LoRelations';
import { LoReverseRelations } from './lo-explorer/LoReverseRelation';

interface UrlData {
  projectName: string;
  topic: string;
  fileName?: string;
  icon?: JSX.Element;
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
    icon = <SchoolIcon sx={{ color: 'primary.main', fontSize: '18px' }} />;
  } else if (archive.startsWith('problems/')) {
    projectName = projectParts[1];
    icon = <Quiz sx={{ color: 'primary.main', fontSize: '18px' }} />;
  } else if (archive.startsWith('KwarcMH/')) {
    projectName = projectParts[0];
    icon = <SchoolIcon sx={{ color: 'primary.main', fontSize: '18px' }} />;
  } else if (archive.startsWith('smglom/')) {
    projectName = projectParts[0];
    icon = <Book sx={{ color: 'primary.main', fontSize: '18px' }} />;
  } else if (archive.startsWith('mkohlhase/')) {
    projectName = projectParts[0];
    icon = <SupervisedUserCircle sx={{ color: 'primary.main', fontSize: '18px' }} />;
  } else if (archive.startsWith('talks/')) {
    projectName = projectParts[0];
    icon = <MicExternalOn sx={{ color: 'primary.main', fontSize: '18px' }} />;
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
    <Box sx={{ padding: 2, border: '1px solid #ccc', borderRadius: 4, backgroundColor: '#f9f9f9' }}>
      {uri ? (
        <FTMLFragment key={uri} fragment={{ type: 'FromBackend', uri: uri }} />
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
    return (
      <Box
        sx={{
          flex: 2,
          minWidth: '250px',
          background: 'rgba(240, 255, 240, 0.9)',
          borderRadius: '8px',
          padding: '16px',
          height: '90vh',
          overflowY: 'auto',
          boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.1)',
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
    <Box sx={{ display: 'flex', gap: '16px', marginTop: '20px', flexWrap: 'wrap' }}>
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
      <Box
        sx={{
          flex: 1,
          minWidth: '250px',
          background: 'rgba(240, 240, 255, 0.9)',
          borderRadius: '8px',
          padding: '16px',
          overflowY: 'auto',
          maxHeight: '90vh',
          boxShadow: 'inset 0 4px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: '16px',
            width: '100%',
          }}
        >
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
          return (
            <Paper
              key={index}
              elevation={3}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '8px',
                background: isInCart ? 'rgba(220, 255, 220, 0.9)' : 'white',
                '&:hover': { boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)' },
              }}
            >
              <Tooltip title={uri} arrow placement="right-start">
                <Typography
                  sx={{
                    cursor: 'pointer',
                    flex: 1,
                    wordBreak: 'break-word',
                    color: selectedUri === uri ? '#096dd9' : '#333',
                    fontWeight: selectedUri === uri ? 'bold' : 'normal',
                    fontSize: '0.875rem',
                    '&:hover': {
                      color: alpha('#096dd9', 0.7),
                    },
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
