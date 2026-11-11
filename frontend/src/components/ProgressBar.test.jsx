import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parseEther } from 'ethers';
import ProgressBar from './ProgressBar';

function fill() {
  return screen.getByRole('progressbar').firstElementChild;
}

describe('ProgressBar', () => {
  it('expose la progression aux lecteurs d’écran', () => {
    render(<ProgressBar raised={parseEther('2.5')} goal={parseEther('5')} />);

    const bar = screen.getByRole('progressbar', { name: 'Progression de la collecte' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar.getAttribute('aria-valuetext')).toMatch(/^50\s%$/);
    expect(fill()).toHaveStyle({ width: '50%' });
  });

  it('arrondit aria-valuenow mais garde la précision dans le texte', () => {
    render(<ProgressBar raised={parseEther('1')} goal={parseEther('3')} />);

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '33');
    expect(bar.getAttribute('aria-valuetext')).toMatch(/^33,3\s%$/);
  });

  it('plafonne à 100 % quand l’objectif est dépassé', () => {
    render(<ProgressBar raised={parseEther('8')} goal={parseEther('5')} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(fill()).toHaveStyle({ width: '100%' });
  });

  it('reste vide, sans largeur minimale, quand rien n’est collecté', () => {
    render(<ProgressBar raised={0n} goal={parseEther('5')} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(fill().style.width).toBe('0%');
    expect(fill().style.minWidth).toBe('');
  });

  it('garde une largeur minimale visible pour une toute petite progression', () => {
    // 0,001 / 5 ETH = 0,02 % : la plus petite précision gérée (point de base)
    render(<ProgressBar raised={parseEther('0.001')} goal={parseEther('5')} />);
    expect(fill().style.minWidth).toBe('0.5rem');
  });

  it('applique la teinte demandée et retombe sur la teinte principale sinon', () => {
    const { rerender } = render(
      <ProgressBar raised={1n} goal={2n} tone="failed" label="Échec" />,
    );
    expect(screen.getByRole('progressbar', { name: 'Échec' })).toBeInTheDocument();
    expect(fill()).toHaveClass('bg-rose-500');

    rerender(<ProgressBar raised={1n} goal={2n} tone="inconnue" />);
    expect(fill()).toHaveClass('from-emerald-500');
  });
});
