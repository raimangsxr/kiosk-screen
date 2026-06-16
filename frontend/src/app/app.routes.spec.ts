import { routes } from './app.routes';

describe('routes', () => {
  it('starts with no product routes during setup scaffolding', () => {
    expect(routes).toEqual([]);
  });
});

