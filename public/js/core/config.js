window.MeridianConfig = {
  appName: "Meridian Chat SDK",
  version: "1.0.1",

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
    id: "user_" + Math.random().toString(36).substring(2, 10),
    page: window.location.href,
    referrer: document.referrer || ""
  },

  tracking: {
    enabled: true,
    provider: "x-pixel"
  }
};