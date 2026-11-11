import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Countdown from './Countdown';

const NOW_SECONDS = 1_700_000_000;

function freezeClock() {
  vi.spyOn(Date, 'now').mockReturnValue(NOW_SECONDS * 1000);
}

describe('Countdown', () => {
  it('affiche le temps restant jusqu’à la deadline', () => {
    freezeClock();
    render(<Countdown deadline={NOW_SECONDS + 3900} />);
    expect(screen.getByText('1 h 5 min restantes')).toBeInTheDocument();
  });

  it('accepte une deadline en bigint, comme renvoyée par le contrat', () => {
    freezeClock();
    render(<Countdown deadline={BigInt(NOW_SECONDS + 2 * 86400)} />);
    expect(screen.getByText('2 j restantes')).toBeInTheDocument();
  });

  it('affiche « Terminée » une fois la deadline passée', () => {
    freezeClock();
    render(<Countdown deadline={NOW_SECONDS - 10} />);
    expect(screen.getByText('Terminée')).toBeInTheDocument();
  });

  it('ajoute le suffixe et la classe fournis', () => {
    freezeClock();
    render(<Countdown deadline={NOW_SECONDS + 30} suffix=" !" className="text-rose-600" />);

    const label = screen.getByText("moins d'une minute restante !");
    expect(label).toHaveClass('tabular-nums', 'text-rose-600');
  });

  it('recalcule quand la deadline change', () => {
    freezeClock();
    const { rerender } = render(<Countdown deadline={NOW_SECONDS + 300} />);
    expect(screen.getByText('5 min restantes')).toBeInTheDocument();

    rerender(<Countdown deadline={NOW_SECONDS + 7200} />);
    expect(screen.getByText('2 h restantes')).toBeInTheDocument();
  });
});
