/**
 * Meridian Admin WhatsApp Settings and Routing
 *
 * Version:
 * v2.5.0
 */

window.MeridianAdminWhatsappSettings = {
    endpoint: "/api/admin/whatsapp-settings",
    settings: null,
    elements: {},

    init() {
        const byId = (id) => document.getElementById(id);

        this.elements = {
            panel: byId("adminWhatsappSettingsPanel"),
            number: byId("adminWhatsappNumber"),
            enabled: byId("adminWhatsappEnabled"),
            save: byId("adminWhatsappSaveBtn"),
            disable: byId("adminWhatsappDisableBtn"),
            restore: byId("adminWhatsappRestoreBtn"),
            test: byId("adminWhatsappTestLink"),
            status: byId("adminWhatsappSettingsStatus"),
            meta: byId("adminWhatsappSettingsMeta"),
            libraryId: byId("adminWhatsappLibraryId"),
            libraryLabel: byId("adminWhatsappLibraryLabel"),
            libraryNumber: byId("adminWhatsappLibraryNumber"),
            libraryEnabled: byId("adminWhatsappLibraryEnabled"),
            librarySave: byId("adminWhatsappLibrarySaveBtn"),
            libraryCancel: byId("adminWhatsappLibraryCancelBtn"),
            numberList: byId("adminWhatsappNumberList"),
            routeKey: byId("adminWhatsappRouteKey"),
            routeNumber: byId("adminWhatsappRouteNumber"),
            routeSave: byId("adminWhatsappRouteSaveBtn"),
            routeList: byId("adminWhatsappRouteList")
        };

        if (!this.elements.panel) {
            return;
        }

        this.bindEvents();
        this.load();
    },

    bindEvents() {
        this.elements.save.onclick = () => this.save();
        this.elements.disable.onclick = () => this.disable();
        this.elements.restore.onclick = () => this.restore();
        this.elements.librarySave.onclick = () => this.saveNumber();
        this.elements.libraryCancel.onclick = () => this.clearNumberForm();
        this.elements.routeSave.onclick = () => this.saveRoute();

        [
            this.elements.number,
            this.elements.libraryNumber
        ].forEach((element) => {
            element.addEventListener("input", () => {
                element.value = element.value
                    .replace(/\D/g, "")
                    .slice(0, 15);
            });
        });

        this.elements.routeKey.addEventListener(
            "input",
            () => {
                this.elements.routeKey.value =
                    this.elements.routeKey.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_-]/g, "")
                    .slice(0, 100);
            }
        );
    },

    busyElements() {
        return [
            this.elements.save,
            this.elements.disable,
            this.elements.restore,
            this.elements.number,
            this.elements.enabled,
            this.elements.libraryLabel,
            this.elements.libraryNumber,
            this.elements.libraryEnabled,
            this.elements.librarySave,
            this.elements.libraryCancel,
            this.elements.routeKey,
            this.elements.routeNumber,
            this.elements.routeSave
        ].filter(Boolean);
    },

    setBusy(busy) {
        this.busyElements().forEach((element) => {
            element.disabled = busy === true;
        });

        if (!busy && this.settings) {
            this.elements.restore.disabled =
                !this.settings.previousNumber;
            this.elements.routeSave.disabled =
                !(this.settings.numbers || []).length;
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

    async runAction(message, action, successMessage) {
        this.setBusy(true);
        this.setMessage(message);

        try {
            const settings = await action();
            this.render(settings);
            this.setMessage(successMessage(settings));
            return settings;
        } catch (error) {
            console.error(
                "WhatsApp routing action failed:",
                error
            );
            this.setMessage(error.message, true);
            return null;
        } finally {
            this.setBusy(false);
        }
    },

    async load() {
        return this.runAction(
            "正在读取 WhatsApp 路由设置…",
            () => this.request(),
            () => "WhatsApp 路由设置已加载。"
        );
    },

    async save() {
        const number = String(
            this.elements.number.value || ""
        ).replace(/\D/g, "");
        const enabled =
            this.elements.enabled.checked === true;

        return this.runAction(
            "正在保存全局设置…",
            () => this.request("", {
                method: "PUT",
                body: JSON.stringify({ number, enabled })
            }),
            (settings) => settings.masterEnabled
                ? "WhatsApp 路由系统已启用，修改立即生效。"
                : "全局设置已保存，WhatsApp 路由系统目前暂停。"
        );
    },

    async disable() {
        return this.runAction(
            "正在暂停全部 WhatsApp 跳转…",
            () => this.request("/disable", {
                method: "POST",
                body: "{}"
            }),
            () => "WhatsApp 路由系统已暂停，客服聊天继续正常运行。"
        );
    },

    async restore() {
        return this.runAction(
            "正在恢复上一个全局号码…",
            () => this.request("/restore", {
                method: "POST",
                body: "{}"
            }),
            () => "已恢复上一个全局号码并启用。"
        );
    },

    clearNumberForm() {
        this.elements.libraryId.value = "";
        this.elements.libraryLabel.value = "";
        this.elements.libraryNumber.value = "";
        this.elements.libraryEnabled.checked = true;
        this.elements.librarySave.textContent = "保存号码";
    },

    editNumber(entry) {
        this.elements.libraryId.value = entry.numberId;
        this.elements.libraryLabel.value = entry.label;
        this.elements.libraryNumber.value = entry.number;
        this.elements.libraryEnabled.checked =
            entry.enabled === true;
        this.elements.librarySave.textContent = "更新号码";
        this.elements.libraryLabel.focus();
    },

    async saveNumber() {
        const numberId = String(
            this.elements.libraryId.value || ""
        ).trim();
        const label = String(
            this.elements.libraryLabel.value || ""
        ).trim();
        const number = String(
            this.elements.libraryNumber.value || ""
        ).replace(/\D/g, "");
        const enabled =
            this.elements.libraryEnabled.checked === true;

        if (!label || number.length < 7 || number.length > 15) {
            this.setMessage(
                "请输入号码名称和 7–15 位国际号码。",
                true
            );
            return;
        }

        const settings = await this.runAction(
            "正在保存号码库…",
            () => this.request("/numbers", {
                method: "POST",
                body: JSON.stringify({
                    numberId,
                    label,
                    number,
                    enabled
                })
            }),
            () => "号码库已更新。"
        );

        if (settings) {
            this.clearNumberForm();
        }
    },

    async deleteNumber(numberId) {
        if (!window.confirm("确定删除这个 WhatsApp 号码吗？")) {
            return;
        }

        return this.runAction(
            "正在删除号码…",
            () => this.request(
                `/numbers/${encodeURIComponent(numberId)}`,
                { method: "DELETE" }
            ),
            () => "号码已删除。"
        );
    },

    async saveRoute() {
        const routeKey = String(
            this.elements.routeKey.value || ""
        ).trim().toLowerCase();
        const numberId = String(
            this.elements.routeNumber.value || ""
        ).trim();

        if (
            !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(routeKey)
            || !numberId
        ) {
            this.setMessage(
                "请输入有效 routeKey 并选择号码。",
                true
            );
            return;
        }

        const settings = await this.runAction(
            "正在保存页面路由…",
            () => this.request(
                `/routes/${encodeURIComponent(routeKey)}`,
                {
                    method: "PUT",
                    body: JSON.stringify({ numberId })
                }
            ),
            () => `页面 ${routeKey} 的号码绑定已生效。`
        );

        if (settings) {
            this.elements.routeKey.value = "";
        }
    },

    async deleteRoute(routeKey) {
        if (!window.confirm(`确定删除 ${routeKey} 的号码绑定吗？`)) {
            return;
        }

        return this.runAction(
            "正在删除页面绑定…",
            () => this.request(
                `/routes/${encodeURIComponent(routeKey)}`,
                { method: "DELETE" }
            ),
            () => `页面 ${routeKey} 已恢复使用全局默认号码。`
        );
    },

    createActionButton(label, handler, className = "") {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = label;
        button.className = className;
        button.addEventListener("click", handler);
        return button;
    },

    renderNumbers(numbers) {
        const list = this.elements.numberList;
        list.replaceChildren();

        if (!numbers.length) {
            const empty = document.createElement("p");
            empty.className = "admin-whatsapp-routing-empty";
            empty.textContent = "号码库为空。";
            list.appendChild(empty);
            return;
        }

        numbers.forEach((entry) => {
            const row = document.createElement("div");
            row.className = "admin-whatsapp-routing-row";

            const info = document.createElement("div");
            const title = document.createElement("strong");
            const detail = document.createElement("span");
            title.textContent = entry.label;
            detail.textContent =
                `${entry.number} · ${entry.enabled ? "启用" : "暂停"} · ${entry.numberId}`;
            info.append(title, detail);

            const actions = document.createElement("div");
            actions.className = "admin-whatsapp-routing-row-actions";
            const test = document.createElement("a");
            test.href = `https://wa.me/${entry.number}`;
            test.target = "_blank";
            test.rel = "noopener noreferrer";
            test.textContent = "测试";
            actions.append(
                test,
                this.createActionButton(
                    "编辑",
                    () => this.editNumber(entry)
                ),
                this.createActionButton(
                    "删除",
                    () => this.deleteNumber(entry.numberId),
                    "is-danger"
                )
            );

            row.append(info, actions);
            list.appendChild(row);
        });
    },

    renderRouteSelect(numbers) {
        const select = this.elements.routeNumber;
        select.replaceChildren();

        if (!numbers.length) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "请先添加号码";
            select.appendChild(option);
            return;
        }

        numbers.forEach((entry) => {
            const option = document.createElement("option");
            option.value = entry.numberId;
            option.textContent =
                `${entry.label} · ${entry.number}${entry.enabled ? "" : "（暂停）"}`;
            select.appendChild(option);
        });
    },

    renderRoutes(routes, numbers) {
        const list = this.elements.routeList;
        const byId = new Map(
            numbers.map((entry) => [entry.numberId, entry])
        );
        list.replaceChildren();

        if (!routes.length) {
            const empty = document.createElement("p");
            empty.className = "admin-whatsapp-routing-empty";
            empty.textContent = "尚未设置页面专属号码，页面将使用全局默认号码。";
            list.appendChild(empty);
            return;
        }

        routes.forEach((route) => {
            const destination = byId.get(route.numberId);
            const row = document.createElement("div");
            row.className = "admin-whatsapp-routing-row";

            const info = document.createElement("div");
            const title = document.createElement("strong");
            const detail = document.createElement("span");
            title.textContent = route.routeKey;
            detail.textContent = destination
                ? `${destination.label} · ${destination.number}`
                : `号码不存在：${route.numberId}`;
            info.append(title, detail);

            const actions = document.createElement("div");
            actions.className = "admin-whatsapp-routing-row-actions";
            const test = document.createElement("a");
            test.href = `/go/whatsapp/${encodeURIComponent(route.routeKey)}`;
            test.target = "_blank";
            test.rel = "noopener noreferrer";
            test.textContent = "测试";
            actions.append(
                test,
                this.createActionButton(
                    "删除绑定",
                    () => this.deleteRoute(route.routeKey),
                    "is-danger"
                )
            );

            row.append(info, actions);
            list.appendChild(row);
        });
    },

    render(settings) {
        this.settings = settings || {};
        const numbers = Array.isArray(this.settings.numbers)
            ? this.settings.numbers
            : [];
        const routes = Array.isArray(this.settings.routes)
            ? this.settings.routes
            : [];

        this.elements.number.value =
            this.settings.number || "";
        this.elements.enabled.checked =
            this.settings.masterEnabled === true
            || (
                this.settings.hasStoredSettings !== true
                && this.settings.enabled === true
            );

        const available =
            this.settings.available === true;
        const sourceLabel = {
            admin: "后台设置",
            environment: "Render 环境变量",
            "environment-fallback": "环境变量兜底"
        }[this.settings.source] || "未配置";

        const updatedText = this.settings.updatedAt
            ? new Date(this.settings.updatedAt).toLocaleString()
            : "无后台修改记录";

        this.elements.meta.textContent =
            `来源：${sourceLabel} · 号码库：${numbers.length} · 页面绑定：${routes.length} · 更新：${updatedText}`
            + (
                this.settings.updatedBy
                ? ` · 操作人：${this.settings.updatedBy}`
                : ""
            );

        this.elements.restore.disabled =
            !this.settings.previousNumber;
        this.elements.test.classList.toggle(
            "is-disabled",
            !(this.settings.enabled && this.settings.number)
        );
        this.elements.test.setAttribute(
            "aria-disabled",
            this.settings.enabled && this.settings.number
                ? "false"
                : "true"
        );
        this.elements.test.onclick = (event) => {
            if (!(this.settings.enabled && this.settings.number)) {
                event.preventDefault();
            }
        };

        this.renderNumbers(numbers);
        this.renderRouteSelect(numbers);
        this.renderRoutes(routes, numbers);
        this.updateLinkCardAvailability(available);
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
