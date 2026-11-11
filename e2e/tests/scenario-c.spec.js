const { test, expect, field, installWallet, donateInApp } = require('../support/test');

test.describe('Scénario C — dons refusés avec un message clair', () => {
  test('un don sous le minimum est refusé avant tout envoi', async ({ page, chain }) => {
    const [creator, donor] = (await chain.accounts()).slice(9, 11);
    const project = await chain.createCampaign(creator, {
      title: 'Scénario C — don minimum',
      goal: '5',
      minContribution: '1',
      durationSeconds: 600,
    });

    await installWallet(page, { account: donor });
    await page.goto(`/project/${project}`);
    await donateInApp(page, '0,5');

    await expect(page.getByText('Le don minimum est de 1 ETH.')).toBeVisible();
    expect(await chain.contribution(project, donor)).toBe(0n);
  });

  test('un don envoyé après la date limite est refusé par le contrat', async ({
    page,
    chain,
  }) => {
    const [creator, donor] = (await chain.accounts()).slice(9, 11);
    const project = await chain.createCampaign(creator, {
      title: 'Scénario C — après la date limite',
      goal: '5',
      minContribution: '1',
      durationSeconds: 60,
    });

    await installWallet(page, { account: donor });
    await page.goto(`/project/${project}`);
    await expect(field(page, 'Montant du don (ETH)')).toBeVisible();

    // La date limite passe pendant que la page est ouverte : la page affiche
    // encore le formulaire, c'est le contrat qui doit refuser.
    await chain.increaseTime(2 * 60, { mine: false });
    await donateInApp(page, '1');

    await expect(
      page.getByText('La campagne est terminée : les dons sont fermés.').first(),
    ).toBeVisible();
    expect(await chain.contribution(project, donor)).toBe(0n);
  });

  test('une fois la campagne terminée, le formulaire de don disparaît', async ({
    page,
    chain,
  }) => {
    const [creator, donor] = (await chain.accounts()).slice(9, 11);
    const project = await chain.createCampaign(creator, {
      title: 'Scénario C — campagne terminée',
      goal: '5',
      minContribution: '1',
      durationSeconds: 60,
    });
    await chain.increaseTime(2 * 60);

    await installWallet(page, { account: donor });
    await page.goto(`/project/${project}`);

    await expect(page.getByText(/Les dons sont clos/)).toBeVisible();
    await expect(field(page, 'Montant du don (ETH)')).toHaveCount(0);
  });
});
