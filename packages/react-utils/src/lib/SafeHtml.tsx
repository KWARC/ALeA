import DOMPurify from 'dompurify';
import React from 'react';

interface SafeHtmlProps {
  html: string;
  className?: string;
  component?: keyof React.JSX.IntrinsicElements;
}

export const SafeHtml: React.FC<SafeHtmlProps> = ({
  html,
  className,
  component: Component = 'div',
}) => {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'span', 'div', 'p', 'br'],
    ALLOWED_ATTR: ['class', 'style'],
  });

  return (
    <Component
      style={{ display: 'inline-block' }}
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
