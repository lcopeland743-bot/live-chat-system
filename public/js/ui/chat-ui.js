window.MeridianChatUI = {
  elements: {},

  init() {
    const config = window.MeridianConfig.chat;

    const container = document.createElement("div");
    container.className = "meridian-chat";

    container.innerHTML = `
      <button class="meridian-chat-button" id="meridianChatButton">💬</button>

      <div class="meridian-chat-panel" id="meridianChatPanel">
        <div class="meridian-chat-header">
          <span>${config.title}</span>
          <button id="meridianChatClose">×</button>
        </div>

        <div class="meridian-chat-messages" id="meridianChatMessages">
          <div class="meridian-message meridian-message-admin">
            ${config.welcomeMessage}
          </div>
        </div>

        <div class="meridian-chat-input">
          <input id="meridianChatInput" type="text" placeholder="${config.placeholder}">
          <button id="meridianChatSend">${config.sendButtonText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    this.elements = {
      button: document.getElementById("meridianChatButton"),
      panel: document.getElementById("meridianChatPanel"),
      close: document.getElementById("meridianChatClose"),
      messages: document.getElementById("meridianChatMessages"),
      input: document.getElementById("meridianChatInput"),
      send: document.getElementById("meridianChatSend")
    };

    this.bindEvents();
  },

  bindEvents() {
    this.elements.button.addEventListener("click", () => {
      this.open();
    });

    this.elements.close.addEventListener("click", () => {
      this.close();
    });

    this.elements.send.addEventListener("click", () => {
      this.handleSend();
    });

    this.elements.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this.handleSend();
      }
    });
  },

  open() {
    this.elements.panel.classList.add("active");

    if (window.MeridianPixel) {
      window.MeridianPixel.chatOpen();
    }
  },

  close() {
    this.elements.panel.classList.remove("active");
  },

  handleSend() {
    const message = this.elements.input.value.trim();

    if (!message) return;

    this.addMessage(message, "user");

    if (window.MeridianSocket) {
      window.MeridianSocket.sendMessage(message);
    }

    if (window.MeridianPixel) {
      window.MeridianPixel.messageSent(message);
    }

    this.elements.input.value = "";
  },

  addMessage(message, sender = "admin") {
    const messageDiv = document.createElement("div");
    messageDiv.className = `meridian-message meridian-message-${sender}`;
    messageDiv.textContent = message;

    this.elements.messages.appendChild(messageDiv);
    this.scrollBottom();
  },

  scrollBottom() {
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }
};