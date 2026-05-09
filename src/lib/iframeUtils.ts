/**
 * Utility to detect if the current application is being rendered inside an iframe
 * and if specific features like WebAuthn/Passkeys are likely to be blocked.
 */

export const isIframe = (): boolean => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // If we can't access window.top, we're definitely in a cross-origin iframe
  }
};

/**
 * Checks if the current environment supports WebAuthn / Passkeys.
 * Returns { supported: boolean, reason?: 'blocked_by_iframe' | 'no_browser_support' }
 */
export const checkPasskeyCapability = async (): Promise<{ supported: boolean, reason?: 'blocked_by_iframe' | 'no_browser_support' }> => {
  if (!window.PublicKeyCredential) {
    return { supported: false, reason: 'no_browser_support' };
  }

  // If we're in an iframe, we need to check if the permissions policy allows it
  if (isIframe()) {
    // We can try to check the permissions policy API if available
    try {
      if ((document as any).featurePolicy && !(document as any).featurePolicy.allowsFeature('publickey-credentials-get')) {
        return { supported: false, reason: 'blocked_by_iframe' };
      }
    } catch (e) {
      // Feature Policy API might not be supported or might throw
    }
    
    // In many environments (like AI Studio preview), it's blocked by default in iframes
    // regardless of the policy in metadata.json if the user hasn't opened in a new tab.
    // We'll return blocked_by_iframe as a warning.
    return { supported: false, reason: 'blocked_by_iframe' };
  }

  return { supported: true };
};

export const getPasskeyErrorLinkMessage = (): string => {
  if (isIframe()) {
    return "🔒 PREVIEW BLOCKED: Passkeys cannot be used inside this frame. Please click 'Open in New Tab' at the top of AI Studio to use your security key.";
  }
  return "Passkey authentication failed. Please try again or use another method.";
};
