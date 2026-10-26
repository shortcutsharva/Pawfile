import { MIN_SHARED_SECRET_LENGTH, validateBackendCredentials } from '@/utils/backend';

const endpoint = 'https://script.google.com/macros/s/AKfycbExampleDeploymentId/exec';
const secret = '0123456789abcdef0123456789abcdef';

describe('backend credential validation', () => {
  it('accepts a deployed Apps Script URL and secret', () => {
    expect(validateBackendCredentials(endpoint, secret)).toEqual({});
  });

  it('rejects empty, malformed, and non-https endpoints', () => {
    expect(validateBackendCredentials('', secret).endpoint).toBeDefined();
    expect(validateBackendCredentials('not-a-url', secret).endpoint).toBeDefined();
    expect(validateBackendCredentials('http://example.com/exec', secret).endpoint).toBeDefined();
  });

  it('rejects hosts other than script.google.com so the secret cannot be sent elsewhere', () => {
    expect(
      validateBackendCredentials('https://evil.example.com/macros/s/abc/exec', secret).endpoint,
    ).toBeDefined();
    expect(
      validateBackendCredentials('https://script.google.com.evil.example.com/exec', secret).endpoint,
    ).toBeDefined();
  });

  it('rejects credentials embedded in the URL', () => {
    expect(
      validateBackendCredentials('https://user:pass@script.google.com/macros/s/abc/exec', secret)
        .endpoint,
    ).toBeDefined();
  });

  it('requires the /exec deployment URL', () => {
    expect(
      validateBackendCredentials('https://script.google.com/macros/s/abc/dev', secret).endpoint,
    ).toBeDefined();
  });

  it('requires a secret', () => {
    expect(validateBackendCredentials(endpoint, '   ').secret).toBeDefined();
  });

  it('requires a secret of at least the documented length', () => {
    expect(validateBackendCredentials(endpoint, 'a'.repeat(MIN_SHARED_SECRET_LENGTH - 1)).secret).toBeDefined();
    expect(validateBackendCredentials(endpoint, 'a'.repeat(MIN_SHARED_SECRET_LENGTH)).secret).toBeUndefined();
  });
});
