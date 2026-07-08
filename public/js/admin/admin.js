(function () {
  function initAdmin() {
    window.MeridianAdminUI.init();

    const socket = window.MeridianAdminSocket.connect();

    if (!socket) {
      window.MeridianAdminUI.addLog("客服后台连接失败");
      return;
    }

    window.MeridianAdminUI.bindSend(() => {
      const message = window.MeridianAdminUI.getInputMessage();

      if (!message) return;

      window.MeridianAdminSocket.sendReply(message);
      window.MeridianAdminUI.clearInput();
    });

    console.log("Meridian Admin initialized");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdmin);
  } else {
    initAdmin();
  }
})();