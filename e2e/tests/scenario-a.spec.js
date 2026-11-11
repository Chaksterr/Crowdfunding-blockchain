const {
  test,
  expect,
  eth,
  installWallet,
  switchAccount,
  campaignHeader,
  field,
  createCampaignInApp,
  donateInApp,
} = require('../support/test');

test.describe('Scénario A — campagne réussie, vote et retrait', () => {
  test('3 dons de 2 ETH, demande de 4 ETH, 2 votes sur 3 : le destinataire reçoit 4 ETH', async ({
    page,
    chain,
  }) => {
    const [creator, donor1, donor2, donor3, recipient] = (await chain.accounts()).slice(1, 6);

    // Comme pendant la démo : un seul navigateur, on change de compte dans MetaMask.
    await installWallet(page, { account: creator });

    await test.step('le créateur lance une campagne de 5 ETH sur 2 minutes', async () => {
      await createCampaignInApp(page, {
        title: 'Scénario A — atelier vélo',
        goal: '5',
        minContribution: '1',
        minutes: 2,
      });
    });

    await test.step('trois donateurs donnent 2 ETH chacun, sans recharger la page', async () => {
      for (const donor of [donor1, donor2, donor3]) {
        await switchAccount(page, donor);
        await donateInApp(page, '2');
        await expect(page.getByText('Merci ! Votre don de 2 ETH est confirmé')).toBeVisible();
      }
      await expect(page.getByText('3 au total')).toBeVisible();
    });

    await test.step('la date limite passe : la campagne est réussie', async () => {
      await chain.increaseTime(3 * 60);
      await page.reload();
      const header = campaignHeader(page);
      await expect(header).toContainText('Réussie');
      // Le compte à rebours suit l'horloge de la chaîne, pas celle du navigateur.
      await expect(header).toContainText('Terminée');
      await expect(header).not.toContainText('restantes');
    });

    await test.step('le créateur demande 4 ETH pour le destinataire', async () => {
      await switchAccount(page, creator);
      await field(page, 'Montant (ETH)').fill('4');
      await field(page, 'Motif').fill("Achat des outils de l'atelier");
      await field(page, 'Destinataire').fill(recipient);
      await page.getByRole('button', { name: 'Créer la demande' }).click();
      await expect(page.getByText('Demande #0 · 4 ETH')).toBeVisible();
      await expect(page.getByText('0 vote sur 3 donateurs')).toBeVisible();
    });

    await test.step('deux donateurs sur trois votent pour la demande', async () => {
      await switchAccount(page, donor1);
      await page.getByRole('button', { name: 'Voter', exact: true }).click();
      await expect(page.getByText('1 vote sur 3 donateurs')).toBeVisible();

      await switchAccount(page, donor2);
      await page.getByRole('button', { name: 'Voter', exact: true }).click();
      await expect(page.getByText('2 votes sur 3 donateurs')).toBeVisible();
      await expect(page.getByText('Quorum atteint')).toBeVisible();
    });

    await test.step('le créateur retire : le destinataire reçoit exactement 4 ETH', async () => {
      const before = await chain.balance(recipient);
      await switchAccount(page, creator);
      await page.getByRole('button', { name: 'Retirer', exact: true }).click();
      await expect(page.getByText('Exécutée', { exact: true })).toBeVisible();
      expect(await chain.balance(recipient)).toBe(before + eth(4));
    });
  });
});
