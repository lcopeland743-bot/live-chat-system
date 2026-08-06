/**
 * Meridian Admin Link Card
 *
 * Version:
 * v2.5.0
 *
 * WhatsApp cards use the selected conversation's landing-page route when
 * available, then fall back to the global redirect.
 */

window.MeridianAdminLinkCard = {
    available: false,

    config: {
        platform: "whatsapp",
        avatar: "",
        title: "Your briefing is ready.",
        subtitle: "",
        buttonText: "Claim for free",
        prefill: ""
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
            ? "发送当前会话对应的 WhatsApp 链接卡片"
            : "请先在 WhatsApp 设置中启用号码";
    },

    getConversationContext() {
        const user =
            window.MeridianAdminState
            && typeof window.MeridianAdminState
                .getCurrentUser === "function"
            ? window.MeridianAdminState
                .getCurrentUser()
            : null;

        return user && user.landingContext
            ? user.landingContext
            : {};
    },

    normalizeRouteKey(value) {
        const key = String(value || "")
            .trim()
            .toLowerCase();

        return /^[a-z0-9][a-z0-9_-]{0,99}$/.test(key)
            ? key
            : "";
    },

    buildUrl(routeKey, prefill = "") {
        const key = this.normalizeRouteKey(routeKey);
        const url = new URL(
            key
                ? `/go/whatsapp/${encodeURIComponent(key)}`
                : "/go/whatsapp",
            window.location.origin
        );

        if (prefill) {
            url.searchParams.set(
                "text",
                String(prefill).slice(0, 500)
            );
        }

        return url.pathname + url.search;
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

        const context = this.getConversationContext();
        const routeKey = this.normalizeRouteKey(
            context.whatsappRouteKey
        );
        const url = this.buildUrl(
            routeKey,
            this.config.prefill
        );
        const message = window.MeridianMessageAdapter
            .createLinkCardMessage({
                ...this.config,
                url
            });

        message.metadata = {
            ...(message.metadata || {}),
            prefill: this.config.prefill,
            whatsappRouteKey: routeKey,
            pageId: context.pageId || "",
            campaignId: context.campaignId || ""
        };

        return message;
    },

    normalizeOutgoingMessage(message) {
        if (
            typeof message === "string"
            && /^(?:https?:\/\/[^/]+)?\/go\/whatsapp(?:\/|\?|$)/i
                .test(message.trim())
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
