const {
  test,
  expect,
  eth,
  attemptsOnWrongChain,
  installWallet,
} = require('../support/test');

test.describe('Portefeuille et réseau', () => {
  test('« Connecter MetaMask » relie le compte au site', async ({ page, chain }) => {
    const [, account] = await chain.accounts();
    await installWallet(page, { account, connected: false });

    await page.goto('/');
    await page.getByRole('button', { name: 'Connecter MetaMask' }).click();

    await expect(page.getByRole('button', { name: new RegExp(account, 'i') })).toBeVisible();
  });

  test('sur un autre réseau, aucune transaction ne part et un message clair s’affiche', async ({
    page,
    chain,
  }) => {
    const [creator, donor] = (await chain.accounts()).slice(9, 11);
    const project = await chain.createCampaign(creator, {
      title: 'Réseau — portefeuille sur Ethereum',
      goal: '50',
      minContribution: '0.5',
      durationSeconds: 60,
    });
    await chain.donate(project, donor, '1');
    await chain.increaseTime(2 * 60);

    // L'utilisateur est resté sur Ethereum (chaîne 1) et refuse de changer.
    await installWallet(page, { account: donor, chainId: 1, rejectNetworkSwitch: true });
    await page.goto(`/project/${project}`);
    await expect(page.getByText('Mauvais réseau', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Rembourser 1 ETH' }).click();

    await expect(
      page
        .getByText('Mauvais réseau : passez sur Hardhat Local (31338) pour signer cette transaction.')
        .first(),
    ).toBeVisible();
    expect(await attemptsOnWrongChain(page)).toBe(0);
    expect(await chain.contribution(project, donor)).toBe(eth(1));
  });
});
