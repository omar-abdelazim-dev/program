const ALLOWED_METHODS = new Set(['mobile_wallet', 'instapay']);

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

export const validateManualPaymentProof = (body = {}) => {
  const proof = {
    transactionId: clean(body.transactionId),
    paymentAccount: clean(body.paymentAccount),
    paymentMethod: clean(body.paymentMethod).toLowerCase(),
    screenshot: clean(body.screenshot),
    invoiceId: clean(body.invoiceId),
  };

  const missingField = Object.entries(proof).find(([, value]) => !value);
  if (missingField) {
    return { error: 'Complete payment details and a receipt screenshot are required for paid items' };
  }

  if (!ALLOWED_METHODS.has(proof.paymentMethod)) {
    return { error: 'Unsupported manual payment method' };
  }

  if (proof.transactionId.length > 100 || proof.invoiceId.length > 100 || proof.paymentAccount.length > 120) {
    return { error: 'Payment details exceed the allowed length' };
  }

  if (proof.paymentMethod === 'mobile_wallet' && !/^\+20\d{10}$/.test(proof.paymentAccount)) {
    return { error: 'Mobile wallet number must contain 10 digits after the +20 country code' };
  }

  try {
    const screenshotUrl = new URL(proof.screenshot);
    if (screenshotUrl.protocol !== 'https:') {
      return { error: 'Payment receipt must use a secure HTTPS URL' };
    }
  } catch {
    return { error: 'Payment receipt URL is invalid' };
  }

  return { proof };
};
