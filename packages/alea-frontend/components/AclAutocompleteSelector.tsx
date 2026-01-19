import { Alert, Autocomplete, Box, Chip, Stack, TextField, Tooltip } from '@mui/material';
import { useEffect, useState } from 'react';

export interface SuggestionItem {
  id?: string;
  name?: string;
  fullName?: string;
  userId?: string;
  description?: string;
}

interface Props {
  label: string;
  fetchSuggestions: (query: string) => Promise<SuggestionItem[]>;
  values: string[];
  setValues: (newValues: string[]) => void;
  chipLabel?: (value: string) => string;
  onTypingChange?: (isTyping: boolean) => void;
  errorMessage?: string;
}

export default function AclAutocompleteSelector({
  label,
  fetchSuggestions,
  values,
  setValues,
  chipLabel = (x) => x,
  onTypingChange,
  errorMessage = 'Invalid or duplicate entry',
}: Props) {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'initial' | 'success' | 'failure'>('initial');
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (input.trim().length > 0) {
        const result = await fetchSuggestions(input);
        setSuggestions(result ?? []);
        onTypingChange?.(true);
      } else {
        setSuggestions([]);
        onTypingChange?.(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [input]);

  const resetStatus = () => {
    setTimeout(() => setStatus('initial'), 1500);
  };

  const handleSelect = (item: any) => {
    if (!item) return;

    const extracted = item.id || item.userId || (typeof item === 'string' ? item : null);

    if (!extracted) return;

    if (!values.includes(extracted)) {
      setValues([...values, extracted]);
      setStatus('success');
    } else {
      setStatus('failure');
    }

    resetStatus();
    setInput('');
    onTypingChange?.(false);
  };

  return (
    <Box mb={3}>
      <Autocomplete
        freeSolo
        options={suggestions}
        getOptionLabel={(opt) =>
          typeof opt === 'string'
            ? opt
            : opt.fullName
            ? `${opt.fullName} (${opt.userId})`
            : opt.description
            ? `${opt.id} (${opt.description})`
            : opt.name || opt.id
        }
        inputValue={input}
        onInputChange={(_, v, reason) => {
          if (reason !== 'reset') {
            setInput(v);
          }
        }}
        onChange={(_, val) => handleSelect(val)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            size="small"
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          />
        )}
      />

      <Stack spacing={1} mt={1}>
        {status === 'success' && (
          <Alert severity="success" variant="outlined">
            Added successfully
          </Alert>
        )}
        {status === 'failure' && (
          <Alert severity="error" variant="outlined">
            {errorMessage}
          </Alert>
        )}
      </Stack>

      <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
        {values.map((val) => (
          <Tooltip title={chipLabel(val)} arrow key={val}>
            <Chip
              label={chipLabel(val)}
              onDelete={() => setValues(values.filter((v) => v !== val))}
            />
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
