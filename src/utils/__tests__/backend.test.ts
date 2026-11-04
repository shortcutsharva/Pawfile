import { MIN_SHARED_SECRET_LENGTH, validateBackendCredentials } from '@/utils/backend';

const endpoint = 'https://pawfile.onrender.com';
const secret = '0123456789abcdef0123456789abcdef';

describe('backend credential validation', () => {
  it('accepts a public https server URL and secret', () => {
    expect(validateBackendCredentials(endpoint, secret)).toEqual({});
  });

  it('accepts an explicit sync endpoint path', () => {
    expect(validateBackendCredentials(`${endpoint}/api/sync`, secret)).toEqual({});
  });

  it('allows plain http only for localhost and private LAN hosts', () => {
    expect(validateBackendCredentials('http://localhost:4000', secret).endpoint).toBeUndefined();
    expect(validateBackendCredentials('http://127.0.0.1:4000', secret).endpoint).toBeUndefined();
    expect(validateBackendCredentials('http://10.0.2.2:4000', secret).endpoint).toBeUndefined();
    expect(validateBackendCredentials('http://192.168.1.20:4000', secret).endpoint).toBeUndefined();
    expect(validateBackendCredentials('http://172.20.0.5:4000', secret).endpoint).toBeUndefined();
    expect(validateBackendCredentials('http://example.com', secret).endpoint).toBeDefined();
  });

  it('rejects empty and malformed endpoints', () => {
    expect(validateBackendCredentials('', secret).endpoint).toBeDefined();
    expect(validateBackendCredentials('not-a-url', secret).endpoint).toBeDefined();
  });

  it('rejects credentials embedded in the URL', () => {
    expect(
      validateBackendCredentials('https://user:pass@pawfile.onrender.com', secret).endpoint,
    ).toBeDefined();
  });

  it('rejects query strings and fragments in the endpoint', () => {
    expect(validateBackendCredentials(`${endpoint}?secret=abc`, secret).endpoint).toBeDefined();
    expect(validateBackendCredentials(`${endpoint}#fragment`, secret).endpoint).toBeDefined();
  });

  it('rejects a subpath because media URLs resolve from the root', () => {
    expect(validateBackendCredentials(`${endpoint}/pawfile`, secret).endpoint).toBeDefined();
  });

  it('requires a secret', () => {
    expect(validateBackendCredentials(endpoint, '   ').secret).toBeDefined();
  });

  it('requires a secret of at least the documented length', () => {
    expect(
      validateBackendCredentials(endpoint, 'a'.repeat(MIN_SHARED_SECRET_LENGTH - 1)).secret,
    ).toBeDefined();
    expect(
      validateBackendCredentials(endpoint, 'a'.repeat(MIN_SHARED_SECRET_LENGTH)).secret,
    ).toBeUndefined();
  });
});
