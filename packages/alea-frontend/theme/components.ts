import { Components } from '@mui/material/styles';

const components: Components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        paddingInline: 16,
      },
    },
  },

  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
    },
  },

  MuiAppBar: {
    styleOverrides: {
      root: {
        boxShadow: 'none',
      },
    },
  },

  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },

  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        fontSize: '0.75rem',
        borderRadius: 6,
      },
    },
  },
};

export default components;
