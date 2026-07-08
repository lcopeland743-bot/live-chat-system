window.MeridianAdminState = {
  currentSocketId: null,
  currentUserId: null,

  setCurrentUser(data) {
    this.currentSocketId = data.socketId;
    this.currentUserId = data.userId || null;
  },

  clearCurrentUser(socketId) {
    if (this.currentSocketId === socketId) {
      this.currentSocketId = null;
      this.currentUserId = null;
    }
  }
};