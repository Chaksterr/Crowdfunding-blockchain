const base = require('@playwright/test');
const { Chain, eth } = require('./chain');
const { attemptsOnWrongChain, installWallet, switchAccount } = require('./wallet');

const { expect } = base;

/** `test` de Playwright, avec un accès direct à la blockchain de test. */
const test = base.test.extend({
  // eslint-disable-next-line no-empty-pattern
  chain: async ({}, use) => {
    const chain = new Chain();
    await use(chain);
    chain.close();
  },
});

/** En-tête de la page d'une campagne : titre, état et compte à rebours. */
function campaignHeader(page) {
  return page.locator('header').filter({ has: page.getByRole('heading', { level: 1 }) });
}

/**
 * Champ texte par son nom accessible. On ne passe pas par le texte du
 * libellé : les champs requis y ajoutent un « * » (masqué aux lecteurs
 * d'écran, donc absent du nom accessible).
 */
function field(page, name) {
  return page.getByRole('textbox', { name, exact: true });
}

/** Crée une campagne avec le formulaire et renvoie son adresse. */
async function createCampaignInApp(
  page,
  { title, description, goal, minContribution, minutes },
) {
  await page.goto('/create');
  await field(page, 'Titre').fill(title);
  await field(page, 'Description').fill(
    description ?? `${title} : campagne créée depuis l'interface par les tests.`,
  );
  await field(page, 'Objectif (ETH)').fill(goal);
  await field(page, 'Don minimum (ETH)').fill(minContribution);
  await page
    .getByRole('spinbutton', { name: 'Durée (minutes)', exact: true })
    .fill(String(minutes));
  await page.getByRole('button', { name: 'Créer la campagne' }).click();

  await page.waitForURL(/\/project\/0x[0-9a-fA-F]{40}$/);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  return page.url().split('/project/')[1];
}

/** Saisit un montant et clique sur « Donner ». */
async function donateInApp(page, amount) {
  await field(page, 'Montant du don (ETH)').fill(amount);
  await page.getByRole('button', { name: 'Donner', exact: true }).click();
}

module.exports = {
  test,
  expect,
  eth,
  installWallet,
  switchAccount,
  attemptsOnWrongChain,
  campaignHeader,
  field,
  createCampaignInApp,
  donateInApp,
};
