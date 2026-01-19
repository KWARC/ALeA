import { render } from '@testing-library/react';

import Markdown from './markdown';

describe('Markdown', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Markdown />);
    expect(baseElement).toBeTruthy();
  });
});
