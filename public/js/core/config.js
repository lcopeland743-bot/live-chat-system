/**
 * Meridian SDK Configuration
 *
 * Version: v1.0.3
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

  window.MeridianConfig = {
    appName: "Meridian Chat SDK",
    version: "1.0.3",

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
      referrer: document.referrer || ""
    },

    tracking: {
      enabled: true,
      provider: "x-pixel"
    }
  };

})();
