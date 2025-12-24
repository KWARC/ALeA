import { Box, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import { QUERY_TEMPLATES } from './query-templates.config';

interface QueryTemplateSelectorProps {
  selectedTemplate: string;
  onTemplateChange: (templateName: string) => void;
}

export const QueryTemplateSelector = ({
  selectedTemplate,
  onTemplateChange,
}: QueryTemplateSelectorProps) => {
  return (
    <FormControl fullWidth sx={{ mb: 2 }}>
      <InputLabel id="template-select-label">Select Query Template</InputLabel>
      <Select
        labelId="template-select-label"
        id="template-select"
        value={selectedTemplate}
        label="Select Query Template"
        onChange={(e) => onTemplateChange(e.target.value)}
      >
        <MenuItem value="">
          <em>Custom Query</em>
        </MenuItem>
        {QUERY_TEMPLATES.map((template) => (
          <MenuItem key={template.name} value={template.name}>
            <Box>
              <Typography variant="body1" fontWeight="bold">
                {template.name}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
