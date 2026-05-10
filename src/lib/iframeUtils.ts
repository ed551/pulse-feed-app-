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
export const checkPasskeyCapability = async (): Promise<{ supported: boolean, isLikelyBlocked?: boolean, reason?: 'blocked_by_iframe' | 'no_browser_support' }> => {
  if (!window.PublicKeyCredential) {
    return { supported: false, reason: 'no_browser_support' };
  }

  // If we're in an iframe, it might be blocked, but we'll let it try
  if (isIframe()) {
    try {
      // document.permissionsPolicy is the modern way to check
      if ((document as any).permissionsPolicy && !(document as any).permissionsPolicy.allowsFeature('publickey-credentials-create')) {
        return { supported: true, isLikelyBlocked: true, reason: 'blocked_by_iframe' };
      }
    } catch (e) {
      // Permissions Policy API might not be supported or might throw
    }
    
    return { supported: true, isLikelyBlocked: true, reason: 'blocked_by_iframe' };
  }

  return { supported: true };
};

export const getPasskeyErrorLinkMessage = (): string => {
  if (isIframe()) {
    return "🔒 PREVIEW BLOCKED: Passkeys cannot be used inside this frame. Please click 'Open in New Tab' at the top of AI Studio to use your security key.";
  }
  return "Passkey authentication failed. Please try again or use another method.";
};
