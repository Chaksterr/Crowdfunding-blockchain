import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { parseEther } from 'ethers';
import DonationPresets from './DonationPresets';

describe('DonationPresets', () => {
  it('propose le don minimum de la campagne puis 0,5, 1 et 2 ETH', () => {
    render(<DonationPresets min={parseEther('0.1')} value="" onSelect={() => {}} />);

    const group = screen.getByRole('group', { name: 'Montants suggérés' });
    const labels = Array.from(group.querySelectorAll('button')).map(
      (button) => button.querySelector('span').textContent,
    );
    expect(labels).toEqual(['0,1 ETH', '0,5 ETH', '1 ETH', '2 ETH']);
  });

  it('renvoie la valeur au format de saisie au clic', async () => {
    const onSelect = vi.fn();
    render(<DonationPresets min={parseEther('0.25')} value="" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: /^0,25 ETH/ }));
    await userEvent.click(screen.getByRole('button', { name: /^2 ETH/ }));

    expect(onSelect).toHaveBeenNthCalledWith(1, '0,25');
    expect(onSelect).toHaveBeenNthCalledWith(2, '2');
  });

  it('marque comme enfoncé le préréglage égal à la saisie courante', () => {
    render(<DonationPresets min={parseEther('0.1')} value="1" onSelect={() => {}} />);

    expect(screen.getByRole('button', { name: /^1 ETH/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^0,5 ETH/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('n’enfonce aucun bouton pour un montant libre', () => {
    render(<DonationPresets min={parseEther('0.1')} value="0,75" onSelect={() => {}} />);

    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAttribute('aria-pressed', 'false');
    }
  });
});
