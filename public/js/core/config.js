/**
 * Meridian SDK Configuration
 *
 * Version: v1.1.0
 */
(function(){

  const identity =
    window.MeridianVisitorIdentity;

  const visitorId =
    identity
    && typeof identity.getOrCreate === "function"
    ? identity.getOrCreate()
    : "user_"
      + Math.random()
        .toString(36)
        .substring(2, 10);

  const conversationId =
    identity
    && typeof identity.getConversationId === "function"
    ? identity.getConversationId()
    : "conversation_"
      + Math.random()
        .toString(36)
        .substring(2, 14);

  function normalizeContextId(value, maximum){
    const text = String(value || "")
      .trim()
      .toLowerCase();

    return (
      text
      && text.length <= maximum
      && /^[a-z0-9][a-z0-9_-]*$/.test(text)
    )
      ? text
      : "";
  }

  const landingSource =
    window.MeridianLandingContext
    && typeof window.MeridianLandingContext === "object"
    ? window.MeridianLandingContext
    : {};

  const landingPageId =
    normalizeContextId(landingSource.pageId, 100);

  const landingContext = {
    pageId: landingPageId,
    pageFamily:
      normalizeContextId(landingSource.pageFamily, 100),
    variantId:
      normalizeContextId(landingSource.variantId, 40),
    campaignId:
      normalizeContextId(landingSource.campaignId, 120),
    whatsappRouteKey:
      normalizeContextId(
        landingSource.whatsappRouteKey || landingPageId,
        100
      )
  };

  window.MeridianConfig = {
    appName: "Meridian Chat SDK",
    version: "1.1.0",

    debug: true,

    socket: {
      url: window.location.origin
    },

    chat: {
      title: "Online Support",
      welcomeMessage: "Hello, how can we help you?",
      placeholder: "Type your message...",
      sendButtonText: "Send"
    },

    user: {
      id: visitorId,
      conversationId,
      page: window.location.href,
      referrer: document.referrer || "",
      landingContext
    },

    tracking: {
      enabled: true,
      provider: "x-pixel"
    }
  };

})();
