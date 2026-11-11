const { test, expect, campaignHeader, installWallet } = require('../support/test');

/** Campagne réussie (3 dons de 2 ETH) avec une demande de retrait de 4 ETH. */
async function successfulCampaignWithRequest(chain, { title, creator, donors, voters }) {
  const project = await chain.createCampaign(creator, {
    title,
    goal: '5',
    minContribution: '1',
    durationSeconds: 60,
  });
  for (const donor of donors) {
    await chain.donate(project, donor, '2');
  }
  await chain.increaseTime(2 * 60);
  await chain.requestWithdrawal(project, creator, {
    amount: '4',
    reason: 'Achat du matériel',
    recipient: creator,
  });
  for (const voter of voters) {
    await chain.vote(project, voter, 0);
  }
  return project;
}

test.describe('Scénario E — doubles actions et accès refusés', () => {
  test('un donateur ne peut pas voter deux fois', async ({ page, chain }) => {
    const [creator, ...donors] = (await chain.accounts()).slice(15, 19);
    const project = await successfulCampaignWithRequest(chain, {
      title: 'Scénario E — double vote',
      creator,
      donors,
      voters: [donors[0]],
    });

    await installWallet(page, { account: donors[0] });
    await page.goto(`/project/${project}`);

    await expect(page.getByText('Votre vote est enregistré.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Voter', exact: true })).toHaveCount(0);
    await expect(chain.vote(project, donors[0], 0)).rejects.toThrow('Deja vote');
  });

  test('seul le créateur peut retirer, même quand le quorum est atteint', async ({
    page,
    chain,
  }) => {
    const [creator, ...donors] = (await chain.accounts()).slice(15, 19);
    const project = await successfulCampaignWithRequest(chain, {
      title: 'Scénario E — retrait par un donateur',
      creator,
      donors,
      voters: [donors[0], donors[1]],
    });

    await installWallet(page, { account: donors[0] });
    await page.goto(`/project/${project}`);

    await expect(page.getByText('Quorum atteint')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retirer', exact: true })).toHaveCount(0);
    await expect(chain.withdraw(project, donors[0], 0)).rejects.toThrow(
      'Createur uniquement',
    );
  });

  test('un donateur ne peut pas être remboursé deux fois', async ({ page, chain }) => {
    const [creator, donor] = (await chain.accounts()).slice(15, 17);
    const project = await chain.createCampaign(creator, {
      title: 'Scénario E — double remboursement',
      goal: '50',
      minContribution: '0.5',
      durationSeconds: 60,
    });
    await chain.donate(project, donor, '1');
    await chain.increaseTime(2 * 60);
    await chain.refund(project, donor);

    await installWallet(page, { account: donor });
    await page.goto(`/project/${project}`);

    await expect(campaignHeader(page)).toContainText('Échouée');
    await expect(page.getByRole('button', { name: /^Rembourser/ })).toHaveCount(0);
    await expect(chain.refund(project, donor)).rejects.toThrow('Rien a rembourser');
  });
});
