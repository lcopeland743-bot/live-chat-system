window.MeridianAdminSocket = {
  socket: null,

  connect() {
    const EVENTS = window.MERIDIAN_EVENTS;

    if (!window.io) {
      MeridianLogger.error(
    "Socket.io not loaded"
);
      return null;
    }

    if (!EVENTS) {
      console.error("MERIDIAN_EVENTS not loaded");
      return null;
    }

    this.socket = io();

    this.socket.on("connect", () => {
      MeridianLogger.info(
    "Admin connected",
    {
        id:this.socket.id
    }
);
      window.MeridianAdminUI.addLog("客服后台已连接");
    });

    this.socket.on(EVENTS.ADMIN_USER_ENTER, (data) => {
      window.MeridianAdminState.setCurrentUser(data);

      window.MeridianAdminUI.addLog(
        `用户进入：${data.page || "未知页面"}`,
        data.time
      );
    });

    this.socket.on(EVENTS.ADMIN_USER_MESSAGE, (data) => {
      window.MeridianAdminState.setCurrentUser(data);

      window.MeridianAdminUI.addMessage(
        data.message,
        "user",
        data.time
      );
    });

    this.socket.on(EVENTS.ADMIN_USER_LEAVE, (data) => {
      window.MeridianAdminState.clearCurrentUser(data.socketId);

      window.MeridianAdminUI.addLog(
        `用户离开：${data.socketId}`,
        data.time
      );
    });

    return this.socket;
  },

  sendReply(message) {
    const EVENTS = window.MERIDIAN_EVENTS;
    const socketId = window.MeridianAdminState.currentSocketId;
    const time = MeridianTime.now();

    if (!socketId || !message) {
      window.MeridianAdminUI.addLog("没有可回复的用户", time);
      return;
    }

    this.socket.emit(EVENTS.ADMIN_REPLY, {
      socketId,
      message,
      time
    });

    window.MeridianAdminUI.addMessage(message, "admin", time);
  }
};