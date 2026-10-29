import { Page } from '@playwright/test';

export class BackendUtils {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async enviarRequestDeBackend(endpoint: string, data: object) {
    const response = await this.page.request.post(endpoint, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      data,
    });
    const responseBody = await response.json();
    return responseBody;
  }
}
