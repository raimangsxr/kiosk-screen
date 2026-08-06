import { createRandomUuid, isUuidV4 } from './random-id';

describe('createRandomUuid', () => {
  const originalCrypto = globalThis.crypto;

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    });
  });

  it('uses crypto.randomUUID when available', () => {
    const randomUUID = jasmine.createSpy('randomUUID').and.returnValue('11111111-2222-4333-8444-555555555555');
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: { randomUUID },
    });

    expect(createRandomUuid()).toBe('11111111-2222-4333-8444-555555555555');
    expect(randomUUID).toHaveBeenCalled();
  });

  it('falls back when crypto.randomUUID is unavailable', () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: (bytes: Uint8Array) => {
          bytes.fill(0xaa);
          return bytes;
        },
      },
    });

    const id = createRandomUuid();
    expect(isUuidV4(id)).toBeTrue();
  });
});
