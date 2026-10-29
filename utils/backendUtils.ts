import { APIResponse, Page } from '@playwright/test';

export class BackendUtils {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async enviarRequestDeBackend(endpoint: string, data: object): Promise<APIResponse> {
    return this.page.request.post(endpoint, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data,
    });
  }
}
