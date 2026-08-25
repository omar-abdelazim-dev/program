// Keep the version identifiers in one server-owned location.  Changing either
// value is a deliberate release step: publish the matching document first,
// then require acceptance of the new version.
export const TERMS_VERSION = '2026-08-25';
export const PRIVACY_NOTICE_VERSION = '2026-08-25';
export const CHECKOUT_TERMS_VERSION = '2026-08-25';

export const LEGAL_DOCUMENTS = {
  terms: TERMS_VERSION,
  privacyNotice: PRIVACY_NOTICE_VERSION,
  checkout: CHECKOUT_TERMS_VERSION,
};
