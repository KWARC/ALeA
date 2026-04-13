import ListIcon from '@mui/icons-material/List';
import { Box, Drawer, IconButton } from '@mui/material';
import { shouldUseDrawer, Window } from '@alea/utils';
import { useTheme } from '@mui/material/styles';
import { createContext, useContext, useEffect, useState } from 'react';
import styles from './stex-react-renderer.module.scss';
const MenuContext = createContext({ offset: 0, inDrawer: false });
const MENU_WIDTH = '300px';
export function FixedPositionMenu({
  staticContent = undefined,
  children,
}: {
  staticContent?: any;
  children: any;
}) {
  const { offset, inDrawer } = useContext(MenuContext);
  const staticSection = (
    <Box
      sx={{
        border: '2px solid',
        borderColor: 'divider',
        fontFamily: 'Open Sans,Verdana,sans-serif',
      }}
    >
      {staticContent}
    </Box>
  );
  const scrollSection = (
    <>
      {children}
      <br />
      <br />
      <br />
    </>
  );
  if (inDrawer) {
    return (
      <Box maxHeight="100vh" maxWidth="400px" display="flex" flexDirection="column">
        {staticSection}
        <Box sx={{ overflowY: 'scroll', overflowX: 'hidden' }}>{scrollSection}</Box>
      </Box>
    );
  }
  return (
    <Box className={styles['dash_outer_box']}>
      <Box className={styles['dash_inner_box']} mt={`${offset}px`}>
        {staticSection}
        <Box className={styles['dash_scroll_area_box']}>
          <Box sx={{ overflowX: 'hidden' }}>{scrollSection}</Box>
        </Box>
      </Box>
    </Box>
  );
}

export function LayoutWithFixedMenu({
  menu,
  children,
  showDashboard,
  setShowDashboard,
  topOffset,
  drawerAnchor = 'left',
  noFrills = false,
}: {
  menu: any;
  children: any;
  showDashboard: boolean;
  setShowDashboard: any;
  topOffset: number;
  drawerAnchor?: 'left' | 'right';
  noFrills?: boolean;
}) {
  const theme = useTheme();
  const [windowSize, setWindowSize] = useState(0);
  const [offset, setOffset] = useState(topOffset);

  useEffect(() => {
    const onScroll = () => setOffset(Math.max(topOffset - (Window?.pageYOffset || 0), 0));
    // clean up code
    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [topOffset]);

  useEffect(() => {
    function handleResize() {
      setWindowSize(Window?.innerWidth || 0);
    }
    setWindowSize(Window?.innerWidth || 0);
    Window?.addEventListener('resize', handleResize);
  }, []);

  const useDrawer = shouldUseDrawer(windowSize);

  return (
    <>
      <Drawer
        anchor={drawerAnchor}
        open={useDrawer && showDashboard}
        onClose={() => setShowDashboard(false)}
      >
        <MenuContext.Provider value={{ offset, inDrawer: true }}>{menu}</MenuContext.Provider>
      </Drawer>

      {!showDashboard && !noFrills && (
        <Box
          sx={{
            position: 'fixed',
            top: useDrawer ? undefined : `${offset + 10}px`,
            bottom: useDrawer ? '20px' : undefined,
            left: drawerAnchor === 'left' ? '5px' : undefined,
            right: drawerAnchor === 'right' ? '5px' : undefined,
            zIndex: 1000,
          }}
        >
          <IconButton
            sx={{
              border: `2px solid ${'primary.main'}`,
              borderRadius: '500px',
              color: 'primary.main',
              backgroundColor: 'background.paper',
              boxShadow: '0px 8px 15px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.3s ease 0s',
              ':hover': {
                boxShadow: '0px 15px 20px rgba(0, 0, 0, 0.4)',
                transform: 'translateY(1px)',
                backgroundColor: 'background.paper',
              },
            }}
            onClick={() => setShowDashboard(true)}
          >
            <ListIcon />
          </IconButton>
        </Box>
      )}

      <Box display="flex" flexDirection={drawerAnchor === 'left' ? 'row' : 'row-reverse'}>
        {!useDrawer && showDashboard && (
          <Box width={MENU_WIDTH} minWidth={MENU_WIDTH} sx={{ overflowY: 'auto' }}>
            <MenuContext.Provider value={{ offset, inDrawer: false }}>{menu}</MenuContext.Provider>
          </Box>
        )}
        <Box
          flex={1}
          width={!useDrawer && showDashboard ? `calc(100% - ${MENU_WIDTH})` : '100%'}
          margin="0 5px"
        >
          {children}
        </Box>
      </Box>
    </>
  );
}
