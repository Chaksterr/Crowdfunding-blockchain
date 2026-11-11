const {
  test,
  expect,
  eth,
  installWallet,
  switchAccount,
  campaignHeader,
  createCampaignInApp,
  donateInApp,
} = require('../support/test');

test.describe('Scénario B — campagne échouée et remboursements', () => {
  test('objectif 50 ETH, dons de 1 et 2 ETH : chacun récupère sa mise, le contrat finit à 0', async ({
    page,
    chain,
  }) => {
    const [creator, donor1, donor2] = (await chain.accounts()).slice(6, 9);
    await installWallet(page, { account: creator });

    let project;
    await test.step('le créateur lance une campagne de 50 ETH (don minimum 0,5)', async () => {
      project = await createCampaignInApp(page, {
        title: 'Scénario B — serre connectée',
        goal: '50',
        minContribution: '0,5',
        minutes: 2,
      });
    });

    await test.step('deux donateurs donnent 1 ETH et 2 ETH', async () => {
      for (const [donor, amount] of [
        [donor1, '1'],
        [donor2, '2'],
      ]) {
        await switchAccount(page, donor);
        await donateInApp(page, amount);
        await expect(
          page.getByText(`Merci ! Votre don de ${amount} ETH est confirmé`),
        ).toBeVisible();
      }
    });

    await test.step('la date limite passe : la campagne a échoué', async () => {
      await chain.increaseTime(3 * 60);
      await page.reload();
      await expect(campaignHeader(page)).toContainText('Échouée');
    });

    for (const [donor, amount] of [
      [donor2, 2],
      [donor1, 1],
    ]) {
      await test.step(`un donateur récupère ses ${amount} ETH`, async () => {
        await switchAccount(page, donor);
        const before = await chain.balance(donor);
        await page.getByRole('button', { name: `Rembourser ${amount} ETH` }).click();
        await expect(page.getByText('Remboursement reçu')).toBeVisible();

        await expect
          .poll(() => chain.contribution(project, donor))
          .toBe(0n);
        // Sa mise, moins les frais de la transaction de remboursement.
        const received = (await chain.balance(donor)) - before;
        expect(received).toBeGreaterThan(eth(amount) - eth('0.001'));
        expect(received).toBeLessThanOrEqual(eth(amount));
        await expect(page.getByRole('button', { name: /^Rembourser/ })).toHaveCount(0);
      });
    }

    await test.step('le contrat de la campagne est vide', async () => {
      expect(await chain.balance(project)).toBe(0n);
    });
  });
});
