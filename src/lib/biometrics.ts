// Biometric Authentication (WebAuthn) Utility
// This is a simplified implementation for demonstration.
// In a production app, you would use a library like @simplewebauthn/browser.

export const isBiometricsSupported = () => {
  return typeof window !== 'undefined' && !!window.PublicKeyCredential;
};

export const registerBiometric = async (userId: string) => {
  if (!isBiometricsSupported()) throw new Error("Biometrics not supported");

  // This is where you would call your backend to get challenge options
  // For this demo, we'll simulate the WebAuthn flow
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "Pulse Feeds",
      id: window.location.hostname,
    },
    user: {
      id: new TextEncoder().encode(userId),
      name: userId,
      displayName: userId,
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
    },
    timeout: 60000,
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  });

  return credential;
};

export const authenticateBiometric = async () => {
  if (!isBiometricsSupported()) throw new Error("Biometrics not supported");

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials: [], // In a real app, you'd fetch allowed credentials from your backend
    userVerification: "required",
    timeout: 60000,
  };

  const credential = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });

  return credential;
};
