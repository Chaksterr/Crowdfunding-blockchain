const { test, expect, installWallet } = require('../support/test');

test.describe('Scénario D — quorum insuffisant', () => {
  test('avec 1 vote sur 3, le créateur ne peut pas retirer', async ({ page, chain }) => {
    const [creator, donor1, donor2, donor3] = (await chain.accounts()).slice(11, 15);
    const project = await chain.createCampaign(creator, {
      title: 'Scénario D — quorum insuffisant',
      goal: '5',
      minContribution: '1',
      durationSeconds: 60,
    });
    for (const donor of [donor1, donor2, donor3]) {
      await chain.donate(project, donor, '2');
    }
    await chain.increaseTime(2 * 60);
    await chain.requestWithdrawal(project, creator, {
      amount: '4',
      reason: 'Achat du matériel',
      recipient: creator,
    });
    await chain.vote(project, donor1, 0);

    await installWallet(page, { account: creator });
    await page.goto(`/project/${project}`);

    await expect(page.getByText('1 vote sur 3 donateurs')).toBeVisible();
    await expect(page.getByText('En attente', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retirer', exact: true })).toHaveCount(0);

    // Le contrat refuse aussi un appel direct, sans passer par l'interface.
    await expect(chain.withdraw(project, creator, 0)).rejects.toThrow(
      "Moins de 50% d'approbation",
    );
  });
});
