import { Components } from '@mui/material/styles';

const components: Components = {
  MuiButton: {
    styleOverrides: {
      root: ({ theme }) => {
        const isDark = (theme as any).palette.mode === 'dark';

        return {
          borderRadius: 8,
          padding: '6px 12px',
          textTransform: 'uppercase',
          fontWeight: 500,
          transition: 'all 0.2s ease',
          color: isDark ? '#ffffff' : '#203360',
        };
      },

      contained: ({ theme }) => {
        const isDark = (theme as any).palette.mode === 'dark';

        return {
          backgroundColor: isDark ? '#223c76' : '#203360',
          color: '#ffffff',
          boxShadow: 'none',

          '&:hover': {
            backgroundColor: isDark ? '#2a4a8f' : '#142445',
            boxShadow: isDark
              ? '0px 4px 10px rgba(0, 0, 0, 0.55)'
              : '0px 6px 16px rgba(32, 51, 96, 0.35)',
          },

          '&:active': {
            boxShadow: isDark
              ? '0px 2px 6px rgba(0, 0, 0, 0.6)'
              : '0px 3px 8px rgba(32, 51, 96, 0.4)',
          },
        };
      },

      outlined: ({ theme }) => {
        const isDark = (theme as any).palette.mode === 'dark';

        return {
          backgroundColor: 'transparent',
          color: isDark ? '#c7d4ff' : '#203360',
          borderColor: isDark ? '#4f6fb3' : '#203360',

          '&:hover': {
            backgroundColor: isDark ? 'rgba(79, 111, 179, 0.14)' : 'rgba(32, 51, 96, 0.06)',
            borderColor: isDark ? '#5c7fd6' : '#192a4d',
            boxShadow: isDark
              ? '0px 3px 8px rgba(0, 0, 0, 0.5)'
              : '0px 4px 12px rgba(32, 51, 96, 0.25)',
          },
        };
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
  MuiOutlinedInput: {
    styleOverrides: {
      root: ({ theme }: { theme: any }) => {
        const isDark = theme.palette.mode === 'dark';

        return {
          backgroundColor: theme.palette.background.paper,
          borderRadius: 10,

          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark ? theme.palette.primary.light : theme.palette.primary.main,
          },

          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
            borderWidth: 1.5,
          },
        };
      },

      notchedOutline: ({ theme }: { theme: any }) => ({
        borderRadius: 10,
        borderColor: theme.palette.divider,
      }),

      input: {
        padding: '12px 14px',
      },
    },
  },
MuiTextField: {
  defaultProps: {
    variant: 'outlined',
  },
  styleOverrides: {
    root: ({ theme }:{theme:any}) => {
      const isDark = theme.palette.mode === 'dark';

      return {
        '& .MuiOutlinedInput-root': {
          borderRadius: 10,
          backgroundColor: theme.palette.background.paper,

          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark
              ? theme.palette.primary.main:theme.palette.divider,
          },

          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: isDark
              ? theme.palette.primary.light
              : theme.palette.primary.main,
          },

          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
        },
      };
    },
  },
},

  MuiInputLabel: {
  styleOverrides: {
    root: ({ theme }:{theme:any}) => ({
      color: theme.palette.text.secondary,

      '&.Mui-focused': {
        color: theme.palette.text.primary,
      },
    }),
  },
},

MuiSelect: {
  styleOverrides: {
    select: ({ theme }:{theme:any}) => ({
      color: theme.palette.text.primary,
    }),

    icon: ({ theme }:{theme:any}) => ({
      color: theme.palette.text.secondary,
    }),
  },
},

MuiAutocomplete: {
  styleOverrides: {
    paper: ({ theme }:{theme:any}) => ({
      borderRadius: 10,
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      borderColor: theme.palette.primary.main,
    }),
    inputRoot: ({ theme }:{theme:any}) => {
            const isDark = theme.palette.mode === 'dark';

      return({
      borderRadius: 10,

      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: isDark?theme.palette.primary.main:theme.palette.divider,
      },

      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: 1.5,
      },
    })},

    option: ({ theme }:{theme:any}) => ({
      '&[aria-selected="true"]': {
        backgroundColor: theme.palette.action.selected,
      },

      '&.Mui-focused': {
        backgroundColor: theme.palette.action.hover,
      },
    }),
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
