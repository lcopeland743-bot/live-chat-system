/**
 * Meridian Admin WhatsApp Settings
 *
 * Version:
 * v2.4.2
 */

window.MeridianAdminWhatsappSettings = {
    endpoint: "/api/admin/whatsapp-settings",
    settings: null,
    elements: {},

    init() {
        this.elements = {
            panel:
                document.getElementById(
                    "adminWhatsappSettingsPanel"
                ),
            number:
                document.getElementById(
                    "adminWhatsappNumber"
                ),
            enabled:
                document.getElementById(
                    "adminWhatsappEnabled"
                ),
            save:
                document.getElementById(
                    "adminWhatsappSaveBtn"
                ),
            disable:
                document.getElementById(
                    "adminWhatsappDisableBtn"
                ),
            restore:
                document.getElementById(
                    "adminWhatsappRestoreBtn"
                ),
            test:
                document.getElementById(
                    "adminWhatsappTestLink"
                ),
            status:
                document.getElementById(
                    "adminWhatsappSettingsStatus"
                ),
            meta:
                document.getElementById(
                    "adminWhatsappSettingsMeta"
                )
        };

        if (!this.elements.panel) {
            return;
        }

        this.bindEvents();
        this.load();
    },

    bindEvents() {
        this.elements.save.onclick = () => {
            this.save();
        };

        this.elements.disable.onclick = () => {
            this.disable();
        };

        this.elements.restore.onclick = () => {
            this.restore();
        };

        this.elements.number.addEventListener(
            "input",
            () => {
                this.elements.number.value =
                    this.elements.number.value
                    .replace(/\D/g, "")
                    .slice(0, 15);
            }
        );
    },

    setBusy(busy) {
        [
            this.elements.save,
            this.elements.disable,
            this.elements.restore,
            this.elements.number,
            this.elements.enabled
        ].forEach((element) => {
            if (element) {
                element.disabled = busy === true;
            }
        });

        if (
            !busy
            && this.elements.restore
            && this.settings
        ) {
            this.elements.restore.disabled =
                !this.settings.previousNumber;
        }
    },

    setMessage(message, isError = false) {
        if (!this.elements.status) {
            return;
        }

        this.elements.status.textContent = message;
        this.elements.status.classList.toggle(
            "is-error",
            isError === true
        );
    },

    async request(path = "", options = {}) {
        const response = await fetch(
            this.endpoint + path,
            {
                credentials: "same-origin",
                cache: "no-store",
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                }
            }
        );

        if (
            window.MeridianAdminAuth
            && window.MeridianAdminAuth
                .handleUnauthorizedResponse(response)
        ) {
            throw new Error(
                "Administrator authentication required"
            );
        }

        const result = await response.json()
            .catch(() => ({}));

        if (!response.ok || result.success !== true) {
            throw new Error(
                result.message
                || "WhatsApp settings request failed"
            );
        }

        return result.settings;
    },

    async load() {
        this.setBusy(true);
        this.setMessage("正在读取 WhatsApp 设置…");

        try {
            const settings = await this.request();
            this.render(settings);
        } catch (error) {
            console.error(
                "WhatsApp settings load failed:",
                error
            );
            this.setMessage(
                "无法读取 WhatsApp 设置。",
                true
            );
            this.updateLinkCardAvailability(false);
        } finally {
            this.setBusy(false);
        }
    },

    async save() {
        const number =
            String(this.elements.number.value || "")
            .replace(/\D/g, "");

        const enabled =
            this.elements.enabled.checked === true;

        if (
            enabled
            && (
                number.length < 7
                || number.length > 15
            )
        ) {
            this.setMessage(
                "启用前请输入 7–15 位国际号码。",
                true
            );
            return;
        }

        this.setBusy(true);
        this.setMessage("正在保存…");

        try {
            const settings = await this.request(
                "",
                {
                    method: "PUT",
                    body: JSON.stringify({
                        number,
                        enabled
                    })
                }
            );

            this.render(settings);
            this.setMessage(
                settings.enabled
                ? "已保存并启用，新的 WhatsApp 跳转立即生效。"
                : "已保存，目前 WhatsApp 功能未启用。"
            );
        } catch (error) {
            console.error(
                "WhatsApp settings save failed:",
                error
            );
            this.setMessage(error.message, true);
        } finally {
            this.setBusy(false);
        }
    },

    async disable() {
        this.setBusy(true);
        this.setMessage("正在暂停 WhatsApp 功能…");

        try {
            const settings = await this.request(
                "/disable",
                {
                    method: "POST",
                    body: "{}"
                }
            );

            this.render(settings);
            this.setMessage(
                "WhatsApp 功能已暂停，客服聊天继续正常运行。"
            );
        } catch (error) {
            console.error(
                "WhatsApp settings disable failed:",
                error
            );
            this.setMessage(error.message, true);
        } finally {
            this.setBusy(false);
        }
    },

    async restore() {
        this.setBusy(true);
        this.setMessage("正在恢复上一个号码…");

        try {
            const settings = await this.request(
                "/restore",
                {
                    method: "POST",
                    body: "{}"
                }
            );

            this.render(settings);
            this.setMessage(
                "已恢复上一个号码并启用。"
            );
        } catch (error) {
            console.error(
                "WhatsApp settings restore failed:",
                error
            );
            this.setMessage(error.message, true);
        } finally {
            this.setBusy(false);
        }
    },

    render(settings) {
        this.settings = settings || {};

        this.elements.number.value =
            this.settings.number || "";

        this.elements.enabled.checked =
            this.settings.enabled === true;

        const enabled =
            this.settings.enabled === true
            && Boolean(this.settings.number);

        const sourceLabel = {
            admin: "后台设置",
            environment: "Render 环境变量",
            "environment-fallback":
                "环境变量故障兜底"
        }[this.settings.source]
        || "未配置";

        if (enabled) {
            this.setMessage(
                `当前已启用：${this.settings.number}`
            );
        } else if (this.settings.number) {
            this.setMessage(
                `号码已保存但未启用：${this.settings.number}`
            );
        } else {
            this.setMessage(
                "当前未配置号码。客服系统不受影响。"
            );
        }

        const updatedText =
            this.settings.updatedAt
            ? new Date(
                this.settings.updatedAt
            ).toLocaleString()
            : "无后台修改记录";

        this.elements.meta.textContent =
            `来源：${sourceLabel} · 更新：${updatedText}`
            + (
                this.settings.updatedBy
                ? ` · 操作人：${this.settings.updatedBy}`
                : ""
            );

        this.elements.restore.disabled =
            !this.settings.previousNumber;

        this.elements.test.classList.toggle(
            "is-disabled",
            !enabled
        );

        this.elements.test.setAttribute(
            "aria-disabled",
            enabled ? "false" : "true"
        );

        this.elements.test.onclick = (event) => {
            if (!enabled) {
                event.preventDefault();
            }
        };

        this.updateLinkCardAvailability(enabled);
    },

    updateLinkCardAvailability(enabled) {
        if (
            window.MeridianAdminLinkCard
            && typeof window.MeridianAdminLinkCard
                .setAvailability === "function"
        ) {
            window.MeridianAdminLinkCard
                .setAvailability(enabled);
        }
    }
};
