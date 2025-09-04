import { ALL_LO_TYPES, LoType } from '@stex-react/spec';
import { CartItem } from './LoCartModal';
import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { capitalizeFirstLetter } from '@stex-react/utils';
import LoListDisplay from '../LoListDisplay';
import { fetchLoFromConceptsAsLoRelations } from './LoFilterAndSearch';

export function LoReverseRelations({
  concept,
  cart,
  handleAddToCart,
  handleRemoveFromCart,
  openDialog,
  handleCloseDialog,
}: {
  concept: string;
  cart: CartItem[];
  handleAddToCart: (uri: string, uriType: LoType) => void;
  handleRemoveFromCart: (uri: string, uriType: LoType) => void;
  openDialog: boolean;
  handleCloseDialog: () => void;
}) {
  const [selectedLo, setSelectedLo] = useState<LoType>('problem');
  const [loUris, setLoUris] = useState<Record<LoType, string[]>>({
    definition: [],
    problem: [],
    example: [],
    para: [],
    statement: [],
  });
  const [filteredUris, setFilteredUris] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUri, setSelectedUri] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const chosenConcept = concept ? [concept] : [];
        const fetchedLoUris = await fetchLoFromConceptsAsLoRelations(chosenConcept, [
          'crossrefs',
          'defines',
          'example-for',
          'objective',
          'precondition',
          'specifies',
        ]);
        const uniqueLoUris = Object.fromEntries(
          Object.keys(loUris).map((key) => [
            key,
            Array.from(new Set(fetchedLoUris[key as LoType] || [])),
          ])
        ) as Record<LoType, string[]>;
        setLoUris(uniqueLoUris);
        setFilteredUris(uniqueLoUris[selectedLo] || []);
      } catch (error) {
        console.error('Error fetching LO relations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [concept]);

  useEffect(() => {
    setSelectedUri(filteredUris.length > 0 ? filteredUris[0] : '');
  }, [filteredUris]);

  const onLoTypeChange = (lo: LoType) => {
    setSelectedLo(lo);
    setFilteredUris(loUris[lo] || []);
  };

  const loTypes = [...ALL_LO_TYPES];
  return (
    <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="md">
      <DialogTitle sx={{ color: 'primary.main', textAlign: 'center' }}>
        {' '}
        Reverse Relations: Learning Objects Referencing Concept
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {loTypes.map((lo) => (
              <Button
                key={lo}
                variant={selectedLo === lo ? 'contained' : 'outlined'}
                sx={{ '&:hover': { backgroundColor: 'primary.light', color: 'white' } }}
                onClick={() => onLoTypeChange(lo)}
              >
                ({capitalizeFirstLetter(lo)} {loUris?.[lo]?.length || 0})
              </Button>
            ))}
          </Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <LoListDisplay
                uris={filteredUris}
                loType={selectedLo}
                cart={cart}
                selectedUri={selectedUri}
                setSelectedUri={setSelectedUri}
                handleAddToCart={handleAddToCart}
                handleRemoveFromCart={handleRemoveFromCart}
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
