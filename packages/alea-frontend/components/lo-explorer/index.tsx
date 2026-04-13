import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Box, Button, Typography } from '@mui/material';
import { ALL_LO_RELATION_TYPES, ALL_LO_TYPES, AllLoRelationTypes, LoType } from '@alea/spec';
import { localStore } from '@alea/utils';
import { useEffect, useMemo, useState } from 'react';
import styles from '../../styles/lo-explorer.module.scss';
import LoListDisplay, { getUrlInfo } from '../LoListDisplay';
import LoCartModal, { CartItem } from './LoCartModal';
import LoFilterAndSearch from './LoFilterAndSearch';
import { bgcolor } from '@mui/system';

export interface ArchiveMap {
  archive: string;
  archiveUrl: string;
}

const getFilteredUris = (
  loType: LoType,
  loUris: Record<LoType, string[]>,
  chosenArchives: string[]
): string[] => {
  const uris = loUris[loType] || [];
  if (chosenArchives.length > 0) {
    return uris.filter((uri) => {
      const { projectName } = getUrlInfo(uri);
      return chosenArchives.some((archive) => archive.toLowerCase() === projectName?.toLowerCase());
    });
  }
  return uris;
};
function LoExplorerHeader({
  setShowCart,
}: {
  setShowCart: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <Box className={styles.titleBox}>
      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
        Learning Objects Explorer
      </Typography>
      <Button
        variant="contained"
        startIcon={<ShoppingCartIcon />}
        onClick={() => setShowCart(true)}
        sx={{
          backgroundColor: 'brown',
          '&:hover': { bgcolor: '#f1f1f1', color: 'primary.main' },
        }}
      >
        Show Cart
      </Button>
    </Box>
  );
}

export function LoExplorer() {
  const [chosenRelations, setChosenRelations] = useState<AllLoRelationTypes[]>([]);
  const [chosenLoTypes, setChosenLoTypes] = useState<LoType[]>([]);
  const [chosenArchivesMap, setChosenArchivesMap] = useState<ArchiveMap[]>([]);
  const [loUris, setLoUris] = useState<Record<LoType, string[]>>({
    definition: [],
    problem: [],
    example: [],
    para: [],
    statement: [],
  });
  const [selectedUri, setSelectedUri] = useState('');
  const [selectedLo, setSelectedLo] = useState<LoType>('problem');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const filteredUris = useMemo(() => {
    const chosenArchives = chosenArchivesMap.map((item) => item.archive);
    return getFilteredUris(selectedLo, loUris, chosenArchives);
  }, [selectedLo, loUris, chosenArchivesMap]);

  const uniqueArchivesMap = useMemo(() => {
    const map: Record<string, string> = {};
    Object.keys(loUris).forEach((loType) => {
      const currentUris = loUris[loType as LoType] || [];
      currentUris.forEach((uri) => {
        const projectName = getUrlInfo(uri)?.projectName;
        if (projectName && !map[projectName]) {
          map[projectName] = uri;
        }
      });
    });
    return map;
  }, [loUris]);

  useEffect(() => {
    setSelectedUri(filteredUris.length > 0 ? filteredUris[0] : '');
  }, [filteredUris]);

  useEffect(() => {
    const storedCart = JSON.parse(localStore?.getItem('lo-cart')) || [];
    setCart(storedCart);
  }, []);

  useEffect(() => {
    localStore?.setItem('lo-cart', JSON.stringify(cart));
  }, [cart]);

  const filteredCounts = useMemo(() => {
    const counts: Record<LoType, number> = {
      definition: 0,
      problem: 0,
      example: 0,
      para: 0,
      statement: 0,
    };
    ALL_LO_TYPES.forEach((loType) => {
      const chosenArchives = chosenArchivesMap.map((item) => item.archive);
      counts[loType] = getFilteredUris(loType, loUris, chosenArchives).length;
    });
    return counts;
  }, [loUris, chosenArchivesMap]);

  let totalFilteredCount = 0;
  ALL_LO_TYPES.forEach((lo) => {
    totalFilteredCount += filteredCounts[lo] || 0;
  });

  const handleAddToCart = (uri: string, uriType: LoType) => {
    const uriWithTypeObj = { uri, uriType };
    const existsInCart = cart.some((item) => item.uri === uri && item.uriType === uriType);
    if (!existsInCart) {
      setCart((prev) => [...prev, uriWithTypeObj]);
    }
  };

  const handleRemoveFromCart = (uri: string, uriType: LoType) => {
    setCart((prev) => prev.filter((item) => !(item.uri === uri && item.uriType === uriType)));
  };

  return (
    <Box className={styles.outerBox} >
      <LoExplorerHeader setShowCart={setShowCart} />
      <LoFilterAndSearch
        uniqueArchivesMap={uniqueArchivesMap}
        chosenArchivesMap={chosenArchivesMap}
        setChosenArchivesMap={setChosenArchivesMap}
        chosenRelations={chosenRelations}
        setChosenRelations={setChosenRelations}
        chosenLoTypes={chosenLoTypes}
        setChosenLoTypes={setChosenLoTypes}
        setLoUris={setLoUris}
      />

      {totalFilteredCount >= 300 && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 2 }}>
          Search result is limited to 300. Add more filters to narrow down your search.
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, width: '100%', flexWrap: 'wrap' }}>
        {(chosenLoTypes.length ? chosenLoTypes : ALL_LO_TYPES).map((lo) => (
          <Button
            key={lo}
            variant={selectedLo === lo ? 'contained' : 'outlined'}
            sx={{ '&:hover': { backgroundColor: 'primary.light', color: 'white' } }}
            onClick={() => setSelectedLo(lo)}
          >
            ({lo} {filteredCounts[lo] || 0})
          </Button>
        ))}
      </Box>

      <LoListDisplay
        uris={filteredUris}
        loType={selectedLo}
        cart={cart}
        selectedUri={selectedUri}
        setSelectedUri={setSelectedUri}
        handleAddToCart={handleAddToCart}
        handleRemoveFromCart={handleRemoveFromCart}
      />

      <LoCartModal
        showCart={showCart}
        setShowCart={setShowCart}
        cart={cart}
        handleRemoveFromCart={handleRemoveFromCart}
      />
    </Box>
  );
}
