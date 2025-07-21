import { useState } from 'react';

export default function StripHtmlPage() {
  const [htmlInput, setHtmlInput] = useState('');
  const [strippedText, setStrippedText] = useState('');

  const handleStrip = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlInput;
    const text = tempDiv.textContent || tempDiv.innerText || '';
    setStrippedText(text);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h1>HTML to Text Converter</h1>
      <textarea
        rows={10}
        style={{ width: '100%', padding: '10px', fontSize: '16px' }}
        value={htmlInput}
        onChange={(e) => setHtmlInput(e.target.value)}
        placeholder="Paste your HTML here..."
      />
      <button
        onClick={handleStrip}
        style={{
          marginTop: '1rem',
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        Convert
      </button>
      {strippedText && (
        <div style={{ marginTop: '2rem' }}>
          <h2>Stripped Text:</h2>
          <pre
            style={{
              background: '#f4f4f4',
              padding: '1rem',
              borderRadius: '5px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {strippedText}
          </pre>
        </div>
      )}
    </div>
  );
}
