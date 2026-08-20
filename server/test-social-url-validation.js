import assert from 'node:assert/strict';
import { normalizeLandingPageSocial } from './utils/socialUrlValidation.js';

const validSocialLinks = normalizeLandingPageSocial({
  email: ' hello@program.com ',
  instagram: 'https://instagram.com/program',
  facebook: 'https://facebook.com/program',
  tiktok: 'https://tiktok.com/@program',
});

assert.deepEqual(validSocialLinks, {
  email: 'hello@program.com',
  instagram: 'https://instagram.com/program',
  facebook: 'https://facebook.com/program',
  tiktok: 'https://tiktok.com/@program',
});

for (const unsafeUrl of ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', 'http://example.com']) {
  assert.equal(
    normalizeLandingPageSocial({ instagram: unsafeUrl }),
    null,
    `Expected ${unsafeUrl} to be rejected`,
  );
}

assert.deepEqual(normalizeLandingPageSocial({ instagram: '' }), { instagram: '' });
console.log('Social URL validation tests passed');
