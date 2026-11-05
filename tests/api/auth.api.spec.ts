import { expect, test } from '../../fixtures';
import type { AuthResponse, ErrorResponse } from '../../types/api';
import { buildUser } from '../../utils/userFactory';

test.describe('Auth API', () => {
  test('TC-009: Sign-up returns 201 with a token and the created user', { tag: '@smoke' }, async ({ api }) => {
    const newUser = buildUser();

    const response = await api.signup(newUser);

    expect(response.status()).toBe(201);
    expect((await response.json()) as AuthResponse).toEqual({
      token: expect.stringMatching(/\S+/),
      user: {
        id: expect.stringMatching(/\S+/),
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
      },
    });
  });

  test(
    'TC-020: Sign-up with an email already in use returns 409',
    { tag: '@regression' },
    async ({ api, createUser }) => {
      const existingUser = await createUser({ initialBalance: null });

      const response = await api.signup(buildUser({ email: existingUser.email }));

      expect(response.status()).toBe(409);
      expect((await response.json()) as ErrorResponse).toEqual({ message: 'Email already in use' });
    },
  );

  for (const missingField of ['firstName', 'lastName', 'email', 'password'] as const) {
    test(`TC-021: Sign-up without ${missingField} returns 400`, { tag: '@regression' }, async ({ api }) => {
      const { [missingField]: _omitted, ...incompleteUser } = buildUser();

      const response = await api.signup(incompleteUser);

      expect(response.status()).toBe(400);
      expect((await response.json()) as ErrorResponse).toEqual({ message: 'All fields are required' });
    });
  }

  test(
    'TC-022: Login with valid credentials returns 200 and a token',
    { tag: '@smoke' },
    async ({ api, createUser }) => {
      const user = await createUser({ initialBalance: null });

      const response = await api.login(user);

      expect(response.status()).toBe(200);
      const body = (await response.json()) as AuthResponse;
      expect(body.token).toMatch(/\S+/);
      expect(body.user.email).toBe(user.email);
    },
  );

  test('TC-023: Login with a wrong password returns 401', { tag: '@regression' }, async ({ api, createUser }) => {
    const user = await createUser({ initialBalance: null });

    const response = await api.login({ email: user.email, password: `${user.password}-wrong` });

    expect(response.status()).toBe(401);
    expect((await response.json()) as ErrorResponse).toEqual({ message: 'Invalid credentials' });
  });

  test(
    'TC-024: Login with an unknown email returns the same 401 as a wrong password',
    { tag: '@regression' },
    async ({ api }) => {
      const response = await api.login({ email: buildUser().email, password: 'Password123!' });

      expect(response.status()).toBe(401);
      expect((await response.json()) as ErrorResponse).toEqual({ message: 'Invalid credentials' });
    },
  );

  test('TC-025: Login without a password returns 400', { tag: '@regression' }, async ({ api }) => {
    const response = await api.login({ email: buildUser().email });

    expect(response.status()).toBe(400);
    expect((await response.json()) as ErrorResponse).toEqual({ message: 'Email and password are required' });
  });
});
