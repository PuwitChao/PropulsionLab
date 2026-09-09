import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5188',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: `${process.platform === 'win32' ? '.venv\\Scripts\\python.exe' : 'python'} -m uvicorn backend.main:app --host 127.0.0.1 --port 8000`,
      url: 'http://127.0.0.1:8000/health',
      reuseExistingServer: false,
      timeout: 30000,
      cwd: '..',
    },
    {
      command: 'npx vite --host 127.0.0.1 --port 5188',
      url: 'http://127.0.0.1:5188',
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
