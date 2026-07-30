/**
 * Meridian Admin Link Card
 *
 * Version:
 * v2.4.2
 *
 * All WhatsApp cards use the stable server redirect.
 */

window.MeridianAdminLinkCard = {
    available: false,

    config: {
        platform: "whatsapp",
        url: "/go/whatsapp",
        avatar: "",
        title: "Your briefing is ready.",
        subtitle: "",
        buttonText: "Claim for free"
    },

    init() {
        this.button = document.getElementById(
            "adminWhatsAppCardBtn"
        );

        if (!this.button) {
            return;
        }

        this.button.disabled = true;
        this.button.title =
            "请先在 WhatsApp 设置中启用号码";

        this.button.onclick = () => {
            this.send();
        };
    },

    setAvailability(available) {
        this.available = available === true;

        if (!this.button) {
            return;
        }

        this.button.disabled = !this.available;
        this.button.title =
            this.available
            ? "发送 WhatsApp 链接卡片"
            : "请先在 WhatsApp 设置中启用号码";
    },

    createMessage() {
        if (!this.available) {
            console.warn(
                "WhatsApp is not configured or enabled"
            );
            return null;
        }

        if (
            !window.MeridianMessageAdapter
            || typeof window.MeridianMessageAdapter
                .createLinkCardMessage !== "function"
        ) {
            console.error(
                "MeridianMessageAdapter link-card not loaded"
            );
            return null;
        }

        return window.MeridianMessageAdapter
            .createLinkCardMessage(this.config);
    },

    normalizeOutgoingMessage(message) {
        if (
            typeof message === "string"
            && message.trim() === this.config.url
        ) {
            return this.createMessage() || message;
        }

        return message;
    },

    send() {
        if (!this.available) {
            return;
        }

        if (
            !window.MeridianAdminSocket
            || typeof window.MeridianAdminSocket
                .sendReply !== "function"
        ) {
            console.error(
                "MeridianAdminSocket not loaded"
            );
            return;
        }

        const message = this.createMessage();

        if (!message) {
            return;
        }

        window.MeridianAdminSocket
            .sendReply(message);
    }
};

window.MeridianAdminLinkCard.init();
