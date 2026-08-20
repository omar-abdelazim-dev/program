const socialUrlFields = ['instagram', 'facebook', 'tiktok'];

export const normalizeLandingPageSocial = (social) => {
  if (!social || typeof social !== 'object' || Array.isArray(social)) return null;

  const normalizedSocial = {};
  if (social.email !== undefined) {
    if (typeof social.email !== 'string') return null;
    normalizedSocial.email = social.email.trim();
  }

  for (const field of socialUrlFields) {
    if (social[field] === undefined) continue;
    if (typeof social[field] !== 'string') return null;

    const value = social[field].trim();
    if (!value) {
      normalizedSocial[field] = '';
      continue;
    }

    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return null;
      normalizedSocial[field] = url.href;
    } catch {
      return null;
    }
  }

  return normalizedSocial;
};
