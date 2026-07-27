/**
 * Meridian Admin WhatsApp Funnel
 *
 * Client-side funnel filters and rendering.
 *
 * Version:
 * v2.4.2
 */

window.MeridianAdminFunnel = {
    initialized: false,
    requestSerial: 0,
    reloadTimer: null,
    collapsed: false,
    storageKey:
        "meridian_admin_funnel_collapsed",
    filters: {
        range: "30d",
        start: "",
        end: "",
        language: "all",
        aiMode: "all",
        leadLevel: "all",
        followUpStatus: "all",
        asset: "",
        intent: ""
    },

    init() {
        this.panel =
            document.getElementById(
                "adminFunnelPanel"
            );
        this.body =
            document.getElementById(
                "adminFunnelBody"
            );
        this.toggleButton =
            document.getElementById(
                "adminFunnelToggleBtn"
            );
        this.refreshButton =
            document.getElementById(
                "adminFunnelRefreshBtn"
            );
        this.resetButton =
            document.getElementById(
                "adminFunnelResetBtn"
            );
        this.status =
            document.getElementById(
                "adminFunnelStatus"
            );
        this.rangeFilter =
            document.getElementById(
                "adminFunnelRange"
            );
        this.startFilter =
            document.getElementById(
                "adminFunnelStart"
            );
        this.endFilter =
            document.getElementById(
                "adminFunnelEnd"
            );
        this.languageFilter =
            document.getElementById(
                "adminFunnelLanguage"
            );
        this.aiModeFilter =
            document.getElementById(
                "adminFunnelAiMode"
            );
        this.leadLevelFilter =
            document.getElementById(
                "adminFunnelLeadLevel"
            );
        this.followUpFilter =
            document.getElementById(
                "adminFunnelFollowUpStatus"
            );
        this.assetFilter =
            document.getElementById(
                "adminFunnelAsset"
            );
        this.intentFilter =
            document.getElementById(
                "adminFunnelIntent"
            );
        this.stageList =
            document.getElementById(
                "adminFunnelStages"
            );
        this.followUpSummary =
            document.getElementById(
                "adminFunnelFollowUpSummary"
            );
        this.topAssets =
            document.getElementById(
                "adminFunnelTopAssets"
            );
        this.daily =
            document.getElementById(
                "adminFunnelDaily"
            );
        this.dataQuality =
            document.getElementById(
                "adminFunnelDataQuality"
            );

        if (!this.panel) {
            return;
        }

        this.restoreCollapsedState();
        this.bind();
        this.updateCustomDateState();
        this.initialized = true;
        this.load();
    },

    isReady() {
        return this.initialized === true;
    },

    restoreCollapsedState() {
        try {
            this.collapsed =
                localStorage.getItem(
                    this.storageKey
                ) === "1";
        }
        catch (error) {
            this.collapsed = false;
        }

        this.renderCollapsedState();
    },

    renderCollapsedState() {
        if (this.body) {
            this.body.hidden =
                this.collapsed;
        }

        if (this.toggleButton) {
            this.toggleButton.textContent =
                this.collapsed
                ? "展开"
                : "收起";
            this.toggleButton
            .setAttribute(
                "aria-expanded",
                String(!this.collapsed)
            );
        }
    },

    toggleCollapsed() {
        this.collapsed =
            !this.collapsed;

        try {
            localStorage.setItem(
                this.storageKey,
                this.collapsed
                ? "1"
                : "0"
            );
        }
        catch (error) {
            // Storage is optional.
        }

        this.renderCollapsedState();

        if (!this.collapsed) {
            this.load();
        }
    },

    bind() {
        if (this.toggleButton) {
            this.toggleButton
            .addEventListener(
                "click",
                () => {
                    this.toggleCollapsed();
                }
            );
        }

        if (this.refreshButton) {
            this.refreshButton
            .addEventListener(
                "click",
                () => {
                    this.readFilters();
                    this.load();
                }
            );
        }

        if (this.resetButton) {
            this.resetButton
            .addEventListener(
                "click",
                () => {
                    this.resetFilters();
                }
            );
        }

        const autoFilters = [
            this.rangeFilter,
            this.languageFilter,
            this.aiModeFilter,
            this.leadLevelFilter,
            this.followUpFilter
        ];

        autoFilters
        .forEach(element => {
            if (!element) {
                return;
            }

            element.addEventListener(
                "change",
                () => {
                    this.readFilters();
                    this.updateCustomDateState();
                    this.load();
                }
            );
        });

        [
            this.startFilter,
            this.endFilter
        ]
        .forEach(element => {
            if (!element) {
                return;
            }

            element.addEventListener(
                "change",
                () => {
                    this.readFilters();

                    if (
                        this.filters.range
                        === "custom"
                        && this.filters.start
                        && this.filters.end
                    ) {
                        this.load();
                    }
                }
            );
        });

        [
            this.assetFilter,
            this.intentFilter
        ]
        .forEach(element => {
            if (!element) {
                return;
            }

            element.addEventListener(
                "keydown",
                event => {
                    if (event.key !== "Enter") {
                        return;
                    }

                    event.preventDefault();
                    this.readFilters();
                    this.load();
                }
            );
        });
    },

    readFilters() {
        this.filters = {
            range:
                this.rangeFilter
                ? this.rangeFilter.value
                : "30d",
            start:
                this.startFilter
                ? this.startFilter.value
                : "",
            end:
                this.endFilter
                ? this.endFilter.value
                : "",
            language:
                this.languageFilter
                ? this.languageFilter.value
                : "all",
            aiMode:
                this.aiModeFilter
                ? this.aiModeFilter.value
                : "all",
            leadLevel:
                this.leadLevelFilter
                ? this.leadLevelFilter.value
                : "all",
            followUpStatus:
                this.followUpFilter
                ? this.followUpFilter.value
                : "all",
            asset:
                this.assetFilter
                ? this.assetFilter.value.trim()
                : "",
            intent:
                this.intentFilter
                ? this.intentFilter.value.trim()
                : ""
        };
    },

    resetFilters() {
        this.filters = {
            range: "30d",
            start: "",
            end: "",
            language: "all",
            aiMode: "all",
            leadLevel: "all",
            followUpStatus: "all",
            asset: "",
            intent: ""
        };

        if (this.rangeFilter) {
            this.rangeFilter.value =
                "30d";
        }
        if (this.startFilter) {
            this.startFilter.value = "";
        }
        if (this.endFilter) {
            this.endFilter.value = "";
        }
        if (this.languageFilter) {
            this.languageFilter.value =
                "all";
        }
        if (this.aiModeFilter) {
            this.aiModeFilter.value =
                "all";
        }
        if (this.leadLevelFilter) {
            this.leadLevelFilter.value =
                "all";
        }
        if (this.followUpFilter) {
            this.followUpFilter.value =
                "all";
        }
        if (this.assetFilter) {
            this.assetFilter.value = "";
        }
        if (this.intentFilter) {
            this.intentFilter.value = "";
        }

        this.updateCustomDateState();
        this.load();
    },

    updateCustomDateState() {
        const custom =
            this.rangeFilter
            && this.rangeFilter.value
                === "custom";

        [
            this.startFilter,
            this.endFilter
        ]
        .forEach(element => {
            if (!element) {
                return;
            }

            element.disabled =
                !custom;
        });
    },

    buildQuery() {
        const parameters =
            new URLSearchParams();

        Object.entries(
            this.filters
        )
        .forEach(([key, value]) => {
            if (
                value === ""
                || value === null
                || value === undefined
            ) {
                return;
            }

            if (
                (
                    key === "start"
                    || key === "end"
                )
                && this.filters.range
                    !== "custom"
            ) {
                return;
            }

            parameters.set(
                key,
                String(value)
            );
        });

        return parameters.toString();
    },

    scheduleReload(delay = 700) {
        if (!this.initialized) {
            return;
        }

        clearTimeout(
            this.reloadTimer
        );

        this.reloadTimer =
            setTimeout(
                () => {
                    this.load({
                        silent: true
                    });
                },
                delay
            );
    },

    async load(options = {}) {
        if (
            !this.initialized
            || this.collapsed
        ) {
            return;
        }

        if (
            this.filters.range
            === "custom"
            && (
                !this.filters.start
                || !this.filters.end
            )
        ) {
            this.setStatus(
                "请选择自定义开始和结束日期。",
                false
            );
            return;
        }

        const requestId =
            ++this.requestSerial;

        if (!options.silent) {
            this.setStatus(
                "正在加载漏斗数据…",
                false
            );
        }

        try {
            const response =
                await fetch(
                    `/api/admin/funnel?${this.buildQuery()}`,
                    {
                        credentials:
                            "same-origin",
                        cache:
                            "no-store"
                    }
                );

            if (
                window.MeridianAdminAuth
                && window.MeridianAdminAuth
                .handleUnauthorizedResponse(
                    response
                )
            ) {
                return;
            }

            const result =
                await response.json();

            if (requestId !== this.requestSerial) {
                return;
            }

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message
                    || "Unable to load funnel analytics."
                );
            }

            this.render(result);

            this.setStatus(
                `已更新 · ${new Date(result.generatedAt).toLocaleString()}`,
                false
            );
        }
        catch (error) {
            console.error(
                "Admin funnel load failed:",
                error
            );

            this.setStatus(
                error.message
                || "漏斗数据加载失败。",
                true
            );
        }
    },

    setStatus(
        message,
        isError
    ) {
        if (!this.status) {
            return;
        }

        this.status.textContent =
            message || "";

        this.status.classList.toggle(
            "error",
            isError === true
        );
    },

    formatRate(value) {
        const rate =
            Number(value);

        return Number.isFinite(rate)
            ? `${rate.toFixed(1).replace(/\.0$/, "")}%`
            : "0%";
    },

    render(result) {
        this.renderStages(
            result.stages || []
        );
        this.renderFollowUpSummary(
            result.followUpSummary || {}
        );
        this.renderTopAssets(
            result.topAssets || []
        );
        this.renderDaily(
            result.daily || []
        );
        this.renderDataQuality(
            result.dataQuality || {}
        );
    },

    renderStages(stages) {
        if (!this.stageList) {
            return;
        }

        this.stageList.innerHTML = "";

        const startCount =
            stages.length
            ? Math.max(
                1,
                Number(
                    stages[0].count
                )
                || 0
            )
            : 1;

        stages.forEach(
            (stage, index) => {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "admin-funnel-stage";

                const heading =
                    document.createElement(
                        "div"
                    );

                heading.className =
                    "admin-funnel-stage-heading";

                const label =
                    document.createElement(
                        "strong"
                    );

                label.textContent =
                    stage.label
                    || stage.key;

                const count =
                    document.createElement(
                        "span"
                    );

                count.textContent =
                    String(
                        Number(stage.count)
                        || 0
                    );

                heading.appendChild(label);
                heading.appendChild(count);

                const track =
                    document.createElement(
                        "div"
                    );

                track.className =
                    "admin-funnel-stage-track";

                const bar =
                    document.createElement(
                        "div"
                    );

                bar.className =
                    "admin-funnel-stage-bar";

                const stageCount =
                    Number(
                        stage.count
                    )
                    || 0;

                bar.style.width =
                    stageCount > 0
                    ? `${Math.max(
                        2,
                        Math.min(
                            100,
                            stageCount
                            / startCount
                            * 100
                        )
                    )}%`
                    : "0%";

                track.appendChild(bar);

                const meta =
                    document.createElement(
                        "small"
                    );

                meta.textContent =
                    index === 0
                    ? "漏斗起点"
                    : `上一步 ${this.formatRate(stage.previousRate)} · 总体 ${this.formatRate(stage.overallRate)} · 流失 ${Number(stage.dropOff) || 0}`;

                item.appendChild(heading);
                item.appendChild(track);
                item.appendChild(meta);
                this.stageList.appendChild(item);
            }
        );

        if (!stages.length) {
            const empty =
                document.createElement(
                    "p"
                );
            empty.className =
                "admin-funnel-empty";
            empty.textContent =
                "当前筛选条件下暂无转化数据。";
            this.stageList.appendChild(
                empty
            );
        }
    },

    renderFollowUpSummary(summary) {
        if (!this.followUpSummary) {
            return;
        }

        const labels = {
            not_followed_up:
                "未跟进",
            contacted:
                "已联系",
            joined_whatsapp:
                "已加入 WhatsApp",
            converted:
                "已转化",
            invalid:
                "无效客户"
        };

        this.followUpSummary.innerHTML =
            "";

        Object.entries(labels)
        .forEach(([key, label]) => {
            const item =
                document.createElement(
                    "span"
                );

            item.className =
                `admin-funnel-status status-${key}`;

            const name =
                document.createElement(
                    "span"
                );
            name.textContent = label;

            const count =
                document.createElement(
                    "strong"
                );
            count.textContent =
                String(
                    Number(summary[key])
                    || 0
                );

            item.appendChild(name);
            item.appendChild(count);
            this.followUpSummary
            .appendChild(item);
        });
    },

    renderTopAssets(items) {
        if (!this.topAssets) {
            return;
        }

        this.topAssets.innerHTML = "";

        if (!items.length) {
            this.topAssets.textContent =
                "暂无资产数据";
            return;
        }

        items
        .slice(0, 6)
        .forEach(item => {
            const chip =
                document.createElement(
                    "span"
                );
            chip.className =
                "admin-funnel-dimension-chip";
            chip.textContent =
                `${item.name} · ${Number(item.count) || 0}`;
            this.topAssets.appendChild(
                chip
            );
        });
    },

    renderDaily(rows) {
        if (!this.daily) {
            return;
        }

        this.daily.innerHTML = "";

        const recent =
            rows.slice(-7);

        if (!recent.length) {
            this.daily.textContent =
                "暂无每日趋势";
            return;
        }

        recent.forEach(row => {
            const item =
                document.createElement(
                    "div"
                );
            item.className =
                "admin-funnel-daily-row";

            const day =
                document.createElement(
                    "span"
                );
            day.textContent =
                row.day;

            const metrics =
                document.createElement(
                    "span"
                );
            metrics.textContent =
                `对话 ${Number(row.conversations) || 0} · 价值 ${Number(row.valueDelivered) || 0} · 展示 ${Number(row.ctaShown) || 0} · 点击 ${Number(row.ctaClicked) || 0}`;

            item.appendChild(day);
            item.appendChild(metrics);
            this.daily.appendChild(item);
        });
    },

    renderDataQuality(data) {
        if (!this.dataQuality) {
            return;
        }

        const unknownLanguage =
            Number(
                data.unknownLanguageUsers
            )
            || 0;

        const unknownMode =
            Number(
                data.unknownAiModeUsers
            )
            || 0;

        this.dataQuality.textContent =
            unknownLanguage
            || unknownMode
            ? `历史数据提示：语言未知 ${unknownLanguage}，AI 模式未知 ${unknownMode}`
            : "当前筛选数据字段完整";
    }
};
