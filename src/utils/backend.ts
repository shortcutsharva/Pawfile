// The shared secret is a bearer credential: whatever endpoint it is sent to receives full access
// to the shared case data. Require HTTPS for public hosts so the secret is never sent in clear
// text. Plain HTTP is allowed only for localhost and private LAN addresses during development.
export const MIN_SHARED_SECRET_LENGTH = 16;

export interface BackendCredentialErrors {
  endpoint?: string;
  secret?: string;
}

function isLocalHost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (hostname === '10.0.2.2') return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  return false;
}

export function validateBackendCredentials(
  endpoint: string,
  secret: string,
): BackendCredentialErrors {
  const errors: BackendCredentialErrors = {};
  const trimmedEndpoint = endpoint.trim();
  if (!trimmedEndpoint) {
    errors.endpoint = 'Enter the server URL.';
  } else {
    try {
      const url = new URL(trimmedEndpoint);
      if (url.username || url.password) {
        errors.endpoint = 'Remove the username or password from the URL.';
      } else if (url.search || url.hash) {
        errors.endpoint = 'Remove the query string or fragment from the URL.';
      } else if (url.protocol === 'http:' && !isLocalHost(url.hostname)) {
        errors.endpoint = 'Use https:// for a public server, or a localhost/LAN address.';
      } else if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.endpoint = 'Enter an http:// or https:// URL.';
      }
    } catch {
      errors.endpoint = 'Enter a valid URL.';
    }
  }
  const trimmedSecret = secret.trim();
  if (!trimmedSecret) {
    errors.secret = 'Enter the shared secret.';
  } else if (trimmedSecret.length < MIN_SHARED_SECRET_LENGTH) {
    errors.secret = `The shared secret must be at least ${MIN_SHARED_SECRET_LENGTH} characters.`;
  }
  return errors;
}
