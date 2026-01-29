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
        fontSize: '1rem',
        borderRadius: 6,
      },
    },
  },

  MuiTextField: {
    defaultProps: {
      variant: 'outlined',
    },
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 10,
        },
      },
    },
  },

  MuiAutocomplete: {
    styleOverrides: {
      paper: {
        borderRadius: 10,
      },
      inputRoot: {
        borderRadius: 10,
      },
    },
  },

  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 10,
      },
    },
  },

  MuiModal: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
    },
  },

  MuiDrawer: {
    styleOverrides: {
      paper: {
        borderRadius: '10px 0 0 10px',
      },
    },
  },

  MuiPopover: {
    styleOverrides: {
      paper: {
        borderRadius: 10,
      },
    },
  },

  MuiCheckbox: {
    styleOverrides: {
      root: {
        borderRadius: 4,
      },
    },
  },

  MuiList: {
    styleOverrides: {
      root: {
        padding: 8,
      },
    },
  },

  MuiSwitch: {
    styleOverrides: {
      root: {
        width: 42,
        height: 26,
        padding: 0,
        marginLeft: 12,
        marginRight: 12,
      },
    },
  },

  MuiSelect: {
    styleOverrides: {
      select: {
        borderRadius: 10,
      },
    },
  },

  MuiAccordion: {
    styleOverrides: {
      root: {
        borderRadius: 10,
        '&:before': {
          display: 'none',
        },
        '&.Mui-expanded': {
          margin: '16px 0',
        },
      },
    },
  },
};

export default components;
