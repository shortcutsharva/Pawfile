const APPS_SCRIPT_HOST = 'script.google.com';

// Mirrors MIN_SECRET_LENGTH in backend/apps-script/Code.gs.
export const MIN_SHARED_SECRET_LENGTH = 16;

export interface BackendCredentialErrors {
  endpoint?: string;
  secret?: string;
}

/**
 * The shared secret is a bearer credential: whatever endpoint it is sent to receives full access
 * to the shared case data. Pinning the endpoint to Google's Apps Script host stops a mistyped or
 * socially engineered URL from quietly mailing the secret and the case history to a third party.
 */
export function validateBackendCredentials(
  endpoint: string,
  secret: string,
): BackendCredentialErrors {
  const errors: BackendCredentialErrors = {};
  const trimmedEndpoint = endpoint.trim();
  if (!trimmedEndpoint) {
    errors.endpoint = 'Enter the Apps Script /exec URL.';
  } else {
    try {
      const url = new URL(trimmedEndpoint);
      if (url.protocol !== 'https:') {
        errors.endpoint = 'Use the https:// Apps Script URL.';
      } else if (url.username || url.password) {
        errors.endpoint = 'Remove the username or password from the URL.';
      } else if (url.hostname !== APPS_SCRIPT_HOST) {
        errors.endpoint = 'Use the https://script.google.com deployment URL.';
      } else if (!url.pathname.endsWith('/exec')) {
        errors.endpoint = 'Use the deployment URL that ends in /exec, not /dev.';
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
