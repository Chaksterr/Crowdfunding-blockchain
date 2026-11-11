const { test, expect, field } = require('../support/test');

test.describe('Scénario F — navigateur sans MetaMask', () => {
  test('les campagnes se lisent, les actions d’écriture sont masquées', async ({
    page,
    chain,
  }) => {
    const accounts = await chain.accounts();
    const [creator, donor] = [accounts[19], accounts[10]];
    const title = 'Scénario F — lecture seule';
    const project = await chain.createCampaign(creator, {
      title,
      goal: '5',
      minContribution: '0.5',
      durationSeconds: 60 * 60,
    });
    await chain.donate(project, donor, '1');

    // Aucun portefeuille installé : window.ethereum n'existe pas.
    await page.goto('/');
    await expect(page.getByText(/MetaMask n.est pas détecté/)).toBeVisible();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await page.goto(`/project/${project}`);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByText('1 au total')).toBeVisible();
    await expect(page.getByText(/Connectez votre portefeuille pour envoyer un don/)).toBeVisible();

    await expect(field(page, 'Montant du don (ETH)')).toHaveCount(0);
    for (const name of ['Voter', 'Retirer', 'Créer la demande']) {
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole('button', { name: /^Rembourser/ })).toHaveCount(0);
  });
});
