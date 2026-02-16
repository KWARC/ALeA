import { Paper } from '@mui/material';
import { LoExplorer } from '../components/lo-explorer';
import MainLayout from '../layouts/MainLayout';

const LoExplorerPage = () => {
  return (
    <MainLayout title="Learning Objects | ALeA">
      <Paper elevation={3} sx={{ m: '16px',bgcolor:'bacground.paper' }} >
        <LoExplorer />
      </Paper>
    </MainLayout>
  );
};

export default LoExplorerPage;
