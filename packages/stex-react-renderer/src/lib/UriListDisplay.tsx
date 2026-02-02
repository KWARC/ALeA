import { Visibility } from '@mui/icons-material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, IconButton, Typography } from '@mui/material';
import { BloomDimension, conceptUriToName } from '@alea/spec';
import { DimIcon } from './SelfAssessmentDialog';

function toBloomDimension(key: string): BloomDimension {
  const key_lc = key.toLowerCase();
  if (key_lc === 'analyze') return BloomDimension.Analyse;
  for (const dim of Object.values(BloomDimension)) {
    if (dim.toLowerCase() === key_lc) return dim;
  }
  throw new Error(`Invalid BloomDimension value: ${key}`);
}

function getBloomDimesionAndUriList(data: string) {
  const uniqueEntries = Array.from(new Set(data.split(',')));

  return uniqueEntries.map((dimAndURI) => {
    const [key, value] = dimAndURI.split(':');
    const dim = toBloomDimension(key);
    const uri = decodeURIComponent(value);
    return [dim, uri] as [BloomDimension, string];
  });
}

function groupingByBloomDimension(data?: string) {
  const groupedData: Record<BloomDimension, string[]> = Object.assign(
    {},
    ...Object.values(BloomDimension).map((dim) => ({ [dim]: [] }))
  );
  if (!data) return groupedData;
  const dimAndURIList = getBloomDimesionAndUriList(data);
  for (const [dim, uri] of dimAndURIList) {
    groupedData[dim].push(uri);
  }
  return groupedData;
}
interface URIListDisplayProps {
  uris?: string[];
  displayReverseRelation?: (conceptUri: string) => void;
}
export function URIListDisplay({ uris, displayReverseRelation }: URIListDisplayProps) {
  const handleCopy = (uri: string) => {
    navigator.clipboard.writeText(uri).then(
      () => alert(`Copied: ${uri}`),
      (err) => console.error('Failed to copy:', err)
    );
  };

  return (
    <Box>
      {uris?.map((uri, index, array) => (
        <span key={index}>
          <a
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', color: 'blue.sky' }}
          >
            {conceptUriToName(uri)}
          </a>
          <IconButton
            size="small"
            onClick={() => handleCopy(uri)}
            aria-label="copy"
            style={{ marginLeft: '5px' }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
          {displayReverseRelation && (
            <IconButton
              size="small"
              onClick={() => displayReverseRelation(uri)}
              aria-label="mirror"
              style={{ marginLeft: '5px' }}
            >
              <Visibility fontSize="small" />
            </IconButton>
          )}
          {index < array.length - 1 ? ',\xa0' : ''}
        </span>
      ))}
    </Box>
  );
}

export function DimAndURIListDisplay({
  title,
  data,
  displayReverseRelation,
}: {
  title: string;
  data?: string;
  displayReverseRelation?: (conceptUri: string) => void;
}) {
  const transformedData = groupingByBloomDimension(data);
  return (
    <Box border="1px solid black" mb="10px" bgcolor="white">
      <Typography fontWeight="bold" sx={{ p: '10px' }}>
        {title}&nbsp;
      </Typography>
      {Object.entries(transformedData)
        .filter(([_, uris]) => uris.length > 0)
        .map(([group, uris]) => (
          <Box key={group} borderTop="1px solid #AAA" p="5px" display="flex" flexWrap="wrap">
            <DimIcon dim={group as BloomDimension} /> &nbsp;
            <URIListDisplay uris={uris} displayReverseRelation={displayReverseRelation} />
          </Box>
        ))}
    </Box>
  );
}
