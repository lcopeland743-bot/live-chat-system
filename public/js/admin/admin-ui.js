window.MeridianAdminUI = {
  elements: {},

  init() {
    this.elements = {
      messages: document.getElementById("adminMessages"),
      input: document.getElementById("adminReplyInput"),
      sendBtn: document.getElementById("adminSendBtn")
    };
  },

  bindSend(handler) {
    this.elements.sendBtn.addEventListener("click", handler);

    this.elements.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        handler();
      }
    });
  },

  getInputMessage() {
    return this.elements.input.value.trim();
  },

  clearInput() {
    this.elements.input.value = "";
  },

  addMessage(message, sender = "user", time = new Date().toISOString()) {
    const div = document.createElement("div");
    div.className = `admin-message admin-message-${sender}`;

    div.innerHTML = `
      <div class="admin-message-text">${message}</div>
      <div class="admin-message-time">${this.formatTime(time)}</div>
    `;

    this.elements.messages.appendChild(div);
    this.scrollToBottom();
  },

  addLog(text, time = new Date().toISOString()) {
    const div = document.createElement("div");
    div.className = "admin-log";
    div.textContent = `${text} · ${this.formatTime(time)}`;

    this.elements.messages.appendChild(div);
    this.scrollToBottom();
  },

  formatTime(time) {
    const date = new Date(time);

    return date.toLocaleString("zh-CN", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  },

  scrollToBottom() {
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }
};