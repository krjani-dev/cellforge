import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
// Import via the public barrel so the test fails if the export is renamed/removed.
import { Spreadsheet } from './index';

describe('Spreadsheet (scaffold)', () => {
  it('renders an empty grid root', () => {
    render(<Spreadsheet />);
    expect(screen.getByTestId('cellforge-spreadsheet')).toBeInTheDocument();
  });

  it('exposes role="grid" for accessibility', () => {
    render(<Spreadsheet />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('accepts a className prop', () => {
    render(<Spreadsheet className="my-class" />);
    expect(screen.getByTestId('cellforge-spreadsheet')).toHaveClass('cellforge-root', 'my-class');
  });
});
