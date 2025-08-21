import { Box, Chip, Typography } from '@mui/material';
import { PRIMARY_COL } from '@stex-react/utils';

interface GenerationParamsProps {
  genParams: any;
  existingProblemUri?: string;
}

export const GenerationParams = ({ genParams, existingProblemUri }: GenerationParamsProps) => {
  if (!genParams) return null;

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      zIndex={11}
      sx={{
        background: 'linear-gradient(135deg, #d7b4b4ff 0%, #f8f9fa 100%)',
        borderRadius: 3,
        p: 3,
        border: '1px solid #e1e5e9',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(8px)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${PRIMARY_COL} 0%, #8B4513 100%)`,
          borderRadius: '12px 12px 0 0',
        },
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 1,
        }}
      >
        Generation Params
      </Typography>

      {genParams?.mode ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: '#34495e', minWidth: '60px' }}
            >
              Mode:
            </Typography>
            <Chip
              label={genParams?.mode}
              size="small"
              sx={{
                backgroundColor: PRIMARY_COL,
                color: 'white',
                fontWeight: 500,
                fontSize: '0.75rem',
              }}
            />
          </Box>

          {genParams?.variantOptions?.theme && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: '#34495e', minWidth: '60px' }}
              >
                Theme:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 400,
                  color: PRIMARY_COL,
                  backgroundColor: '#f8f9fa',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  border: `1px solid ${PRIMARY_COL}20`,
                }}
              >
                {genParams?.variantOptions?.theme}
              </Typography>
            </Box>
          )}

          {genParams?.variantOptions?.minorEditType && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: '#34495e', minWidth: '80px' }}
              >
                Minor Edit:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 400,
                  color: PRIMARY_COL,
                  backgroundColor: '#f8f9fa',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  border: `1px solid ${PRIMARY_COL}20`,
                }}
              >
                {genParams?.variantOptions?.minorEditType}
              </Typography>
            </Box>
          )}

          {genParams?.variantOptions?.variantType && genParams?.variantOptions?.language && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: '#34495e', minWidth: '80px' }}
                >
                  Variant Type:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 400,
                    color: PRIMARY_COL,
                    backgroundColor: '#f8f9fa',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    border: `1px solid ${PRIMARY_COL}20`,
                  }}
                >
                  {genParams?.variantOptions?.variantType}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: '#34495e', minWidth: '120px' }}
                >
                  Translated Language:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 400,
                    color: PRIMARY_COL,
                    backgroundColor: '#f8f9fa',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    border: `1px solid ${PRIMARY_COL}20`,
                  }}
                >
                  {genParams?.variantOptions?.language}
                </Typography>
              </Box>
            </>
          )}

          {genParams?.variantOptions?.variantType && genParams?.variantOptions?.modifyType && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: '#34495e', minWidth: '80px' }}
                >
                  Modify Choices:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 400,
                    color: PRIMARY_COL,
                    backgroundColor: '#f8f9fa',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    border: `1px solid ${PRIMARY_COL}20`,
                  }}
                >
                  {genParams?.variantOptions?.modifyType}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: '#34495e', minWidth: '120px' }}
                >
                  Selected Options:
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 400,
                    color: PRIMARY_COL,
                    backgroundColor: '#f8f9fa',
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    border: `1px solid ${PRIMARY_COL}20`,
                  }}
                >
                  {Array.isArray(genParams?.variantOptions?.optionsToModify)
                    ? genParams.variantOptions.optionsToModify.join(', ')
                    : genParams?.variantOptions?.optionsToModify}
                </Typography>
              </Box>
            </>
          )}

          {genParams?.sourceProblem?.problemId && (
            <Box
              sx={{
                mt: 1,
                pt: 1.5,
                borderTop: '1px solid #e1e5e9',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, color: '#34495e', minWidth: '120px' }}
              >
                Source Problem ID:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: '#2c3e50',
                  backgroundColor: '#ecf0f1',
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  fontFamily: 'monospace',
                }}
              >
                {genParams?.sourceProblem?.problemId}
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Box
          sx={{
            mt: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#34495e' }}>
            Source Problem URI:
          </Typography>
          <Box
            component="a"
            href={existingProblemUri}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontWeight: 800,
              color: PRIMARY_COL,
              textDecoration: 'none',
              backgroundColor: '#f8f9fa',
              px: 2,
              py: 1,
              borderRadius: 2,
              border: `1px solid ${PRIMARY_COL}30`,
              transition: 'all 0.2s ease',
              fontSize: '0.875rem',
              wordBreak: 'break-all',
              '&:hover': {
                backgroundColor: `${PRIMARY_COL}08`,
                borderColor: PRIMARY_COL,
                transform: 'translateY(-1px)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            {existingProblemUri}
          </Box>
        </Box>
      )}
    </Box>
  );
};
