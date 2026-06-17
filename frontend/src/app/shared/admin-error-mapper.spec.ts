import { mapAdminError } from './admin-error-mapper';

describe('mapAdminError', () => {
  it('returns non-sensitive API details', () => {
    expect(mapAdminError({ error: { detail: 'Name is required.' } })).toBe('Name is required.');
  });

  it('hides internal paths and traces', () => {
    expect(mapAdminError({ error: { detail: 'Traceback /Users/dev/secret' } }, 'Could not save.')).toBe('Could not save.');
  });
});
