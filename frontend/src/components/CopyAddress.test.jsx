import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import CopyAddress from './CopyAddress';

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

afterEach(() => {
  vi.useRealTimers();
});

describe('CopyAddress', () => {
  it('affiche l’adresse raccourcie avec l’adresse complète en infobulle', () => {
    render(<CopyAddress value={ADDRESS} />);

    const short = screen.getByText('0x1234…5678');
    expect(short).toHaveAttribute('title', ADDRESS);
    expect(screen.getByRole('button', { name: "Copier l'adresse" })).toBeInTheDocument();
  });

  it('utilise le libellé et la longueur fournis', () => {
    render(<CopyAddress value={ADDRESS} label="le créateur" chars={6} />);

    expect(screen.getByText('0x123456…345678')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copier le créateur' })).toBeInTheDocument();
  });

  it('ne rend rien sans adresse', () => {
    const { container } = render(<CopyAddress value="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('copie l’adresse complète, l’annonce puis revient à l’état initial', async () => {
    vi.useFakeTimers();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<CopyAddress value={ADDRESS} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(writeText).toHaveBeenCalledWith(ADDRESS);
    expect(screen.getByText('Adresse copiée')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2200);
    });
    expect(screen.queryByText('Adresse copiée')).not.toBeInTheDocument();
  });

  it('annonce l’échec si le presse-papiers refuse', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    render(<CopyAddress value={ADDRESS} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button'));
    });

    expect(screen.getByText('Copie impossible')).toBeInTheDocument();
  });
});
