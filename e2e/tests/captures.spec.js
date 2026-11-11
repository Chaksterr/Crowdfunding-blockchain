const path = require('node:path');
const { test, expect, field, installWallet } = require('../support/test');
const { APP_URL } = require('../support/constants');

// Lancé seulement par `npm run e2e:captures` : les images sont versionnées
// dans docs/commun/captures pour le rapport et la présentation.
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'docs', 'commun', 'captures');

const SCREENS = [
  {
    suffix: 'ordinateur',
    options: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
  },
  {
    suffix: 'telephone',
    options: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
  },
];

test.describe('Captures d’écran pour le rapport @captures', () => {
  test('pages principales, sur ordinateur et sur téléphone', async ({ browser, chain }) => {
    test.setTimeout(240_000);
    const [, creator, donor1, donor2, donor3] = await chain.accounts();

    // Données de démonstration, proches de `npm run seed`.
    const success = await chain.createCampaign(creator, {
      title: 'Album photo des étudiants',
      description: "Un album souvenir de l'année, imprimé et distribué sur le campus.",
      goal: '5',
      minContribution: '0.5',
      durationSeconds: 60,
    });
    const failed = await chain.createCampaign(creator, {
      title: 'Serre connectée du campus',
      description:
        'Une serre automatisée pour le potager pédagogique : capteurs, irrigation et éclairage.',
      goal: '50',
      minContribution: '0.5',
      durationSeconds: 60,
    });
    await chain.donate(success, donor1, '2');
    await chain.donate(success, donor2, '2');
    await chain.donate(success, donor3, '1');
    await chain.donate(failed, donor1, '1');
    await chain.donate(failed, donor2, '2');
    await chain.increaseTime(2 * 60);
    await chain.requestWithdrawal(success, creator, {
      amount: '3',
      reason: "Impression et reliure de l'album",
      recipient: creator,
    });
    await chain.vote(success, donor1, 0);
    await chain.vote(success, donor2, 0);

    const ongoing = await chain.createCampaign(creator, {
      title: 'Atelier vélo solidaire',
      description:
        'Un atelier de réparation de vélos ouvert aux étudiants : outils, pièces et accompagnement.',
      goal: '5',
      minContribution: '0.1',
      durationSeconds: 2 * 24 * 60 * 60,
    });
    await chain.donate(ongoing, donor1, '1.5');
    await chain.donate(ongoing, donor2, '0.8');
    const games = await chain.createCampaign(donor3, {
      title: 'Ludothèque de la résidence',
      description: 'Des jeux de société en libre accès dans la salle commune de la résidence.',
      goal: '3',
      minContribution: '0.1',
      durationSeconds: 5 * 24 * 60 * 60,
    });
    await chain.donate(games, donor1, '0.6');
    const hackathon = await chain.createCampaign(donor2, {
      title: 'Hackathon blockchain du campus',
      description: 'Un week-end pour construire des DApps en équipe, repas et prix compris.',
      goal: '10',
      minContribution: '0.2',
      durationSeconds: 7 * 24 * 60 * 60,
    });
    await chain.donate(hackathon, donor1, '3');
    await chain.donate(hackathon, donor3, '1');

    for (const { suffix, options } of SCREENS) {
      const capture = async (name, { account, url, prepare }) => {
        const context = await browser.newContext({
          ...options,
          baseURL: APP_URL,
          locale: 'fr-FR',
          timezoneId: 'Europe/Paris',
        });
        const page = await context.newPage();
        await installWallet(page, { account });
        await page.goto(url);
        await prepare(page);
        // Laisse finir les compteurs et les barres de progression animés.
        await page.waitForTimeout(1500);
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `${name}-${suffix}.png`),
          animations: 'disabled',
        });
        await context.close();
      };

      await capture('01-accueil', {
        account: donor1,
        url: '/',
        prepare: (page) =>
          expect(page.getByRole('heading', { name: 'Atelier vélo solidaire' })).toBeVisible(),
      });

      await capture('02-creer-une-campagne', {
        account: creator,
        url: '/create',
        prepare: async (page) => {
          await field(page, 'Titre').fill('Fresque du hall');
          await field(page, 'Description').fill(
            'Une fresque réalisée par les étudiants des Beaux-Arts dans le hall principal.',
          );
          await field(page, 'Objectif (ETH)').fill('4');
          await field(page, 'Don minimum (ETH)').fill('0,2');
          await page.getByRole('button', { name: '24 h' }).click();
          await page.getByRole('heading', { name: 'Lancer une collecte' }).scrollIntoViewIfNeeded();
        },
      });

      await capture('03-campagne-en-cours', {
        account: donor3,
        url: `/project/${ongoing}`,
        prepare: (page) =>
          expect(field(page, 'Montant du don (ETH)')).toBeVisible(),
      });

      await capture('04-campagne-reussie-vote', {
        account: creator,
        url: `/project/${success}`,
        prepare: async (page) => {
          await expect(page.getByRole('button', { name: 'Retirer', exact: true })).toBeVisible();
          await page.getByText('Demande #0 · 3 ETH').scrollIntoViewIfNeeded();
        },
      });

      await capture('05-campagne-echouee-remboursement', {
        account: donor2,
        url: `/project/${failed}`,
        prepare: (page) =>
          expect(page.getByRole('button', { name: 'Rembourser 2 ETH' })).toBeVisible(),
      });

      await capture('06-mes-contributions', {
        account: donor1,
        url: '/my-contributions',
        prepare: (page) =>
          expect(page.getByText('Hackathon blockchain du campus').first()).toBeVisible(),
      });
    }
  });
});
