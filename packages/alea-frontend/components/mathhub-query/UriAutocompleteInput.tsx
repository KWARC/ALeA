import { searchUriUsingSubstr } from '@alea/spec';
import { Autocomplete, TextField } from '@mui/material';
import { useEffect, useState } from 'react';

interface UriAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  size?: 'small' | 'medium';
  sx?: object;
}

export const UriAutocompleteInput = ({
  value,
  onChange,
  placeholder,
  label,
  size = 'small',
  sx,
}: UriAutocompleteInputProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce the search
  useEffect(() => {
    const searchUris = async () => {
      if (!inputValue || inputValue.length < 2) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await searchUriUsingSubstr(inputValue);
        setOptions(results);
      } catch (error) {
        console.error('Error searching URIs:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchUris, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  // Sync inputValue with value prop
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  return (
    <Autocomplete
      freeSolo
      options={options}
      value={value}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => {
        setInputValue(newInputValue);
      }}
      onChange={(_, newValue) => {
        const stringValue = typeof newValue === 'string' ? newValue : '';
        onChange(stringValue);
        setInputValue(stringValue);
      }}
      loading={loading}
      size={size}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size={size}
        />
      )}
    />
  );
};

