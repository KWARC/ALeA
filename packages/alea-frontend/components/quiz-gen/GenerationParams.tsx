import { Box, Typography } from '@mui/material';
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
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
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
        }
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
        <>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Mode:{' '}
            <Box component="span" sx={{ fontWeight: 400, color: PRIMARY_COL }}>
              {genParams?.mode}
            </Box>
          </Typography>

          {genParams?.variantOptions?.theme && (
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Theme:{' '}
              <Box component="span" sx={{ fontWeight: 400, color: PRIMARY_COL }}>
                {genParams?.variantOptions?.theme}
              </Box>
            </Typography>
          )}

          {genParams?.variantOptions?.minorEditType && (
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Minor Edit:{' '}
              <Box component="span" sx={{ fontWeight: 400, color: PRIMARY_COL }}>
                {genParams?.variantOptions?.minorEditType}
              </Box>
            </Typography>
          )}

          {(genParams?.variantOptions?.variantType && genParams?.variantOptions?.language )&&(
            <>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
             Variant Type:{' '}
              <Box component="span" sx={{ fontWeight: 400, color: PRIMARY_COL }}>
                {genParams?.variantOptions?.variantType}
              </Box>
            </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Translated Language:{' '}
                <Box component="span" sx={{ fontWeight: 400, color: PRIMARY_COL }}>
                  {genParams?.variantOptions?.language}
                </Box>
              </Typography>
            </>
          )}

          {genParams?.sourceProblem?.problemId && (
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Source Problem Id:{' '}
              <Box component="span" sx={{ fontWeight: 400 }}>
                {genParams?.sourceProblem?.problemId}
              </Box>
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          Source Problem Uri:{' '}
          <Box
            component="a"
            href={existingProblemUri}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              fontWeight: 400,
              color: PRIMARY_COL,
              textDecoration: 'underline',
            }}
          >
            {existingProblemUri}
          </Box>
        </Typography>
      )}
    </Box>
  );
};
