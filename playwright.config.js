/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: 'tests/playwright',
  use: {
    baseURL: 'http://127.0.0.1:8080'
  },
  webServer: {
    command: 'npm run start -- --host 0.0.0.0 --dev',
    port: 8080,
    reuseExistingServer: true,
    timeout: 120000
  }
};
