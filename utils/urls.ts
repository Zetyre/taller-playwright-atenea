const frontendBaseUrl = (process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://localhost:6007').replace(/\/+$/, '');

export function frontendUrl(path: string): string {
  return new URL(path, `${frontendBaseUrl}/`).toString();
}

export function apiUrl(path: string): string {
  return new URL(path, `${apiBaseUrl}/`).toString();
}

export { frontendBaseUrl };
