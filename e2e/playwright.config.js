// @ts-check
const { defineConfig, devices } = require('@playwright/test');
const {
  APP_PORT,
  APP_URL,
  FACTORY_ADDRESS,
  RPC_PORT,
  RPC_URL,
} = require('./support/constants');

/**
 * Tests de bout en bout : une vraie blockchain Hardhat, l'application web
 * compilée pour la production et un vrai navigateur (Chromium).
 * Lancement : `npm run e2e` depuis la racine du dépôt.
 */
module.exports = defineConfig({
  testDir: './tests',
  outputDir: './output/results',
  // Une seule blockchain partagée : les tests s'exécutent l'un après l'autre.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: './output/report', open: 'never' }],
  ],
  globalSetup: require.resolve('./support/global-setup'),
  use: {
    ...devices['Desktop Chrome'],
    baseURL: APP_URL,
    viewport: { width: 1280, height: 800 },
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      // Blockchain neuve à chaque lancement, sur un port dédié.
      command: `npx hardhat node --port ${RPC_PORT}`,
      cwd: '..',
      port: RPC_PORT,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // Build de production (hors de frontend/dist) servi par `vite preview` :
      // les tests portent sur ce qui serait réellement livré.
      command: `npx vite build --outDir ../e2e/output/app --emptyOutDir && npx vite preview --outDir ../e2e/output/app --host 127.0.0.1 --port ${APP_PORT} --strictPort`,
      cwd: '../frontend',
      url: APP_URL,
      reuseExistingServer: false,
      timeout: 120_000,
      env: { VITE_RPC_URL: RPC_URL, VITE_FACTORY_ADDRESS: FACTORY_ADDRESS },
    },
  ],
});
