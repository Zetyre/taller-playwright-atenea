import { APIRequestContext, expect } from '@playwright/test';

type UserData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export class BackendUtils {
  static async registerUserwithAPI(
    request: APIRequestContext,
    usuario: UserData,
  ): Promise<{ email: string; password: string }> {
    const [emailName, emailDomain] = usuario.email.split('@');
    const email = `${emailName}${Date.now()}@${emailDomain}`;
    const response = await request.post('http://localhost:6007/api/auth/signup', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: {
        ...usuario,
        email,
      },
    });

    expect(response.status()).toBe(201);
    return { email, password: usuario.password };
  }
}
