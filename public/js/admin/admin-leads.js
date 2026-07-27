/**
 * Meridian Admin Lead Management
 *
 * Search, filters, pagination, manual labels,
 * and deterministic high-intent customer identification.
 *
 * Version:
 * v2.4.2
 */

window.MeridianAdminLeads = {
    initialized: false,
    requestSerial: 0,
    debounceTimer: null,
    reloadTimer: null,
    currentSessionRefreshTimer: null,
    localTimeTimer: null,
    currentSession: null,
    labelSaving: false,
    followUpSaving: false,
    pagination: {
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 1,
        hasPrevious: false,
        hasNext: false
    },
    intentSummary: {
        high: 0,
        medium: 0,
        low: 0
    },
    filters: {
        q: "",
        status: "all",
        aiMode: "all",
        intentLevel: "all",
        whatsapp: "all",
        unread: "all",
        takeover: "all",
        priority: "all",
        followUpStatus: "all",
        tag: "",
        sort: "recent",
        page: 1,
        limit: 25
    },

    init() {
        this.searchInput =
            document.getElementById(
                "adminSessionSearch"
            );
        this.statusFilter =
            document.getElementById(
                "adminSessionStatusFilter"
            );
        this.intentFilter =
            document.getElementById(
                "adminSessionIntentFilter"
            );
        this.aiModeFilter =
            document.getElementById(
                "adminSessionAiModeFilter"
            );
        this.whatsappFilter =
            document.getElementById(
                "adminSessionWhatsappFilter"
            );
        this.unreadFilter =
            document.getElementById(
                "adminSessionUnreadFilter"
            );
        this.takeoverFilter =
            document.getElementById(
                "adminSessionTakeoverFilter"
            );
        this.priorityFilter =
            document.getElementById(
                "adminSessionPriorityFilter"
            );
        this.followUpFilter =
            document.getElementById(
                "adminSessionFollowUpFilter"
            );
        this.tagFilter =
            document.getElementById(
                "adminSessionTagFilter"
            );
        this.sortFilter =
            document.getElementById(
                "adminSessionSortFilter"
            );
        this.resetButton =
            document.getElementById(
                "adminSessionFilterResetBtn"
            );
        this.resultStatus =
            document.getElementById(
                "adminSessionResultStatus"
            );
        this.previousButton =
            document.getElementById(
                "adminSessionPreviousBtn"
            );
        this.nextButton =
            document.getElementById(
                "adminSessionNextBtn"
            );
        this.pageStatus =
            document.getElementById(
                "adminSessionPageStatus"
            );
        this.knownTagList =
            document.getElementById(
                "adminKnownTagList"
            );
        this.highIntentCount =
            document.getElementById(
                "adminHighIntentCount"
            );
        this.mediumIntentCount =
            document.getElementById(
                "adminMediumIntentCount"
            );
        this.lowIntentCount =
            document.getElementById(
                "adminLowIntentCount"
            );
        this.intentSummaryButtons =
            Array.from(
                document.querySelectorAll(
                    "[data-admin-intent-level]"
                )
            );

        this.panel =
            document.getElementById(
                "adminLeadPanel"
            );
        this.currentUserId =
            document.getElementById(
                "adminLeadUserId"
            );
        this.intentBadge =
            document.getElementById(
                "adminLeadIntentBadge"
            );
        this.ipAddress =
            document.getElementById(
                "adminLeadIpAddress"
            );
        this.ipHint =
            document.getElementById(
                "adminLeadIpHint"
            );
        this.location =
            document.getElementById(
                "adminLeadLocation"
            );
        this.localTime =
            document.getElementById(
                "adminLeadLocalTime"
            );
        this.userAgent =
            document.getElementById(
                "adminLeadUserAgent"
            );
        this.intentReasons =
            document.getElementById(
                "adminLeadIntentReasons"
            );
        this.prioritySelect =
            document.getElementById(
                "adminLeadPriority"
            );
        this.followUpSelect =
            document.getElementById(
                "adminLeadFollowUpStatus"
            );
        this.followUpMeta =
            document.getElementById(
                "adminLeadFollowUpMeta"
            );
        this.manualTags =
            document.getElementById(
                "adminLeadManualTags"
            );
        this.autoTags =
            document.getElementById(
                "adminLeadAutoTags"
            );
        this.tagInput =
            document.getElementById(
                "adminLeadTagInput"
            );
        this.addTagButton =
            document.getElementById(
                "adminLeadAddTagBtn"
            );
        this.message =
            document.getElementById(
                "adminLeadMessage"
            );

        this.bindFilters();
        this.bindLeadEditor();

        clearInterval(
            this.localTimeTimer
        );

        this.localTimeTimer =
            setInterval(
                () => {
                    this.refreshCurrentLocalTime();
                },
                30000
            );

        this.initialized = true;
        this.renderPagination();
        this.renderCurrentSession(null);
    },

    isReady() {
        return this.initialized === true;
    },

    bindFilters() {
        const debounceSearch = () => {
            clearTimeout(
                this.debounceTimer
            );

            this.debounceTimer =
                setTimeout(
                    () => {
                        this.filters.q =
                            this.searchInput
                            ? this.searchInput.value.trim()
                            : "";
                        this.filters.tag =
                            this.tagFilter
                            ? this.tagFilter.value.trim()
                            : "";
                        this.filters.page = 1;
                        this.loadSessions();
                    },
                    300
                );
        };

        if (this.searchInput) {
            this.searchInput.addEventListener(
                "input",
                debounceSearch
            );
        }

        if (this.tagFilter) {
            this.tagFilter.addEventListener(
                "input",
                debounceSearch
            );
        }

        const selectBindings = [
            [
                this.statusFilter,
                "status"
            ],
            [
                this.intentFilter,
                "intentLevel"
            ],
            [
                this.aiModeFilter,
                "aiMode"
            ],
            [
                this.whatsappFilter,
                "whatsapp"
            ],
            [
                this.unreadFilter,
                "unread"
            ],
            [
                this.takeoverFilter,
                "takeover"
            ],
            [
                this.priorityFilter,
                "priority"
            ],
            [
                this.followUpFilter,
                "followUpStatus"
            ],
            [
                this.sortFilter,
                "sort"
            ]
        ];

        selectBindings.forEach(
            ([element, key]) => {
                if (!element) {
                    return;
                }

                element.addEventListener(
                    "change",
                    () => {
                        this.filters[key] =
                            element.value;
                        this.filters.page = 1;

                        if (key === "intentLevel") {
                            this.renderIntentSummary();
                        }

                        this.loadSessions();
                    }
                );
            }
        );

        this.intentSummaryButtons
        .forEach(button => {
            button.addEventListener(
                "click",
                () => {
                    const level =
                        button.dataset
                        .adminIntentLevel;

                    this.filters.intentLevel =
                        this.filters.intentLevel
                            === level
                        ? "all"
                        : level;
                    this.filters.page = 1;

                    if (this.intentFilter) {
                        this.intentFilter.value =
                            this.filters.intentLevel;
                    }

                    this.renderIntentSummary();
                    this.loadSessions();
                }
            );
        });

        if (this.resetButton) {
            this.resetButton.addEventListener(
                "click",
                () => {
                    this.resetFilters();
                }
            );
        }

        if (this.previousButton) {
            this.previousButton.addEventListener(
                "click",
                () => {
                    if (
                        !this.pagination
                        .hasPrevious
                    ) {
                        return;
                    }

                    this.filters.page =
                        Math.max(
                            1,
                            this.filters.page - 1
                        );
                    this.loadSessions();
                }
            );
        }

        if (this.nextButton) {
            this.nextButton.addEventListener(
                "click",
                () => {
                    if (
                        !this.pagination
                        .hasNext
                    ) {
                        return;
                    }

                    this.filters.page += 1;
                    this.loadSessions();
                }
            );
        }
    },

    bindLeadEditor() {
        if (this.prioritySelect) {
            this.prioritySelect.addEventListener(
                "change",
                () => {
                    if (!this.currentSession) {
                        return;
                    }

                    this.updateLabels({
                        priority:
                            this.prioritySelect.value
                    });
                }
            );
        }

        if (this.followUpSelect) {
            this.followUpSelect
            .addEventListener(
                "change",
                () => {
                    if (!this.currentSession) {
                        return;
                    }

                    this.updateFollowUp(
                        this.followUpSelect
                        .value
                    );
                }
            );
        }

        if (this.addTagButton) {
            this.addTagButton.addEventListener(
                "click",
                () => {
                    this.addTag();
                }
            );
        }

        if (this.tagInput) {
            this.tagInput.addEventListener(
                "keydown",
                event => {
                    if (event.key !== "Enter") {
                        return;
                    }

                    event.preventDefault();
                    this.addTag();
                }
            );
        }
    },

    resetFilters() {
        this.filters = {
            q: "",
            status: "all",
            aiMode: "all",
            intentLevel: "all",
            whatsapp: "all",
            unread: "all",
            takeover: "all",
            priority: "all",
            followUpStatus: "all",
            tag: "",
            sort: "recent",
            page: 1,
            limit: 25
        };

        if (this.searchInput) {
            this.searchInput.value = "";
        }
        if (this.tagFilter) {
            this.tagFilter.value = "";
        }
        if (this.statusFilter) {
            this.statusFilter.value = "all";
        }
        if (this.intentFilter) {
            this.intentFilter.value = "all";
        }
        if (this.aiModeFilter) {
            this.aiModeFilter.value = "all";
        }
        if (this.whatsappFilter) {
            this.whatsappFilter.value = "all";
        }
        if (this.unreadFilter) {
            this.unreadFilter.value = "all";
        }
        if (this.takeoverFilter) {
            this.takeoverFilter.value = "all";
        }
        if (this.priorityFilter) {
            this.priorityFilter.value = "all";
        }
        if (this.followUpFilter) {
            this.followUpFilter.value = "all";
        }
        if (this.sortFilter) {
            this.sortFilter.value = "recent";
        }

        this.renderIntentSummary();
        this.loadSessions();
    },

    buildQuery() {
        const parameters =
            new URLSearchParams();

        Object.entries(
            this.filters
        )
        .forEach(
            ([key, value]) => {
                if (
                    value === ""
                    || value === null
                    || value === undefined
                ) {
                    return;
                }

                parameters.set(
                    key,
                    String(value)
                );
            }
        );

        return parameters.toString();
    },

    async loadSessions(
        options = {}
    ) {
        if (!this.initialized) {
            return;
        }

        const requestId =
            ++this.requestSerial;

        this.setResultStatus(
            "正在加载会话…",
            false
        );

        try {
            const response =
                await fetch(
                    `/api/admin/sessions?${this.buildQuery()}`,
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
                    || "Unable to load conversations."
                );
            }

            this.pagination =
                result.pagination
                || this.pagination;
            this.intentSummary =
                result.intentSummary
                || this.intentSummary;
            this.filters.page =
                this.pagination.page
                || this.filters.page;

            MeridianAdminState.setSessions(
                result.sessions || [],
                {
                    preserveCurrent: true,
                    preserveOrder: true
                }
            );

            MeridianAdminUI.renderSessions(
                false
            );

            this.renderKnownTags(
                result.knownTags || []
            );
            this.renderIntentSummary();
            this.renderPagination();

            const highCount =
                Number(
                    this.intentSummary.high
                    || 0
                );

            this.setResultStatus(
                `找到 ${this.pagination.total || 0} 个会话 · 高意向 ${highCount}`,
                false
            );

            const currentId =
                MeridianAdminState
                .getCurrentConversationId();

            if (currentId) {
                const current =
                    (result.sessions || [])
                    .find(
                        item =>
                            item.userId === currentId
                    );

                if (current) {
                    this.renderCurrentSession(
                        current
                    );
                }
            }

            if (
                options.restoreCurrentSession
                && MeridianAdminUI
                .restoreCurrentSession
            ) {
                await MeridianAdminUI
                    .restoreCurrentSession();
            }
        }
        catch (error) {
            console.error(
                "Admin lead session load failed:",
                error
            );

            this.setResultStatus(
                error.message
                || "会话加载失败",
                true
            );
        }
    },

    scheduleReload(delay = 250) {
        clearTimeout(
            this.reloadTimer
        );

        this.reloadTimer =
            setTimeout(
                () => {
                    this.loadSessions();
                },
                delay
            );
    },

    scheduleCurrentSessionRefresh(
        userId,
        delay = 200
    ) {
        clearTimeout(
            this.currentSessionRefreshTimer
        );

        this.currentSessionRefreshTimer =
            setTimeout(
                async () => {
                    const currentId =
                        MeridianAdminState
                        .getCurrentConversationId();

                    if (currentId !== userId) {
                        return;
                    }

                    const enriched =
                        await this.fetchSession(
                            userId
                        );

                    if (
                        !enriched
                        || MeridianAdminState
                        .getCurrentConversationId()
                            !== userId
                    ) {
                        return;
                    }

                    this.currentSession =
                        enriched;

                    const existing =
                        MeridianAdminState
                        .getConversationSessionByUserId(
                            userId
                        );

                    if (existing) {
                        Object.assign(
                            existing,
                            enriched
                        );
                        MeridianAdminUI
                        .renderSessions(false);
                    }

                    this.renderCurrentSession(
                        enriched
                    );
                },
                delay
            );
    },

    handleSessionUpdate(session) {
        if (
            !session
            || !session.userId
        ) {
            return;
        }

        const existing =
            MeridianAdminState
            .getConversationSessionByUserId(
                session.userId
            );

        if (existing) {
            Object.assign(
                existing,
                session
            );
        }

        if (
            this.currentSession
            && this.currentSession.userId
                === session.userId
        ) {
            this.currentSession = {
                ...this.currentSession,
                ...session,
                conversionState: {
                    ...(
                        this.currentSession
                        .conversionState
                        || {}
                    ),
                    ...(
                        session.conversionState
                        || {}
                    )
                }
            };

            this.renderCurrentSession(
                this.currentSession
            );

            this.scheduleCurrentSessionRefresh(
                session.userId
            );
        }

        this.scheduleReload();
    },

    async fetchSession(userId) {
        try {
            const response =
                await fetch(
                    `/api/admin/sessions/${encodeURIComponent(userId)}`,
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
                return null;
            }

            const result =
                await response.json();

            if (!response.ok || !result.success) {
                return null;
            }

            return result.session || null;
        }
        catch (error) {
            console.error(
                "Admin session fetch failed:",
                error
            );
            return null;
        }
    },

    renderKnownTags(tags) {
        if (!this.knownTagList) {
            return;
        }

        this.knownTagList.innerHTML = "";

        (tags || [])
        .forEach(tag => {
            const option =
                document.createElement(
                    "option"
                );
            option.value = tag;
            this.knownTagList.appendChild(
                option
            );
        });
    },

    renderIntentSummary() {
        if (this.highIntentCount) {
            this.highIntentCount.textContent =
                Number(
                    this.intentSummary.high
                    || 0
                );
        }

        if (this.mediumIntentCount) {
            this.mediumIntentCount.textContent =
                Number(
                    this.intentSummary.medium
                    || 0
                );
        }

        if (this.lowIntentCount) {
            this.lowIntentCount.textContent =
                Number(
                    this.intentSummary.low
                    || 0
                );
        }

        this.intentSummaryButtons
        .forEach(button => {
            button.classList.toggle(
                "active",
                button.dataset
                .adminIntentLevel
                    === this.filters
                    .intentLevel
            );
        });
    },

    renderPagination() {
        if (this.pageStatus) {
            this.pageStatus.textContent =
                `第 ${this.pagination.page || 1} / ${this.pagination.totalPages || 1} 页`;
        }

        if (this.previousButton) {
            this.previousButton.disabled =
                !this.pagination.hasPrevious;
        }

        if (this.nextButton) {
            this.nextButton.disabled =
                !this.pagination.hasNext;
        }
    },

    setResultStatus(
        message,
        isError
    ) {
        if (!this.resultStatus) {
            return;
        }

        this.resultStatus.textContent =
            message || "";
        this.resultStatus.classList.toggle(
            "error",
            isError === true
        );
    },

    setMessage(
        message,
        isError = false
    ) {
        if (!this.message) {
            return;
        }

        this.message.textContent =
            message || "";
        this.message.classList.toggle(
            "error",
            isError === true
        );
    },

    refreshCurrentLocalTime() {
        if (!this.localTime) {
            return;
        }

        const formatter =
            window.MeridianAdminUI
            && typeof window.MeridianAdminUI
                .formatVisitorLocalTime === "function"
            ? window.MeridianAdminUI
                .formatVisitorLocalTime
                .bind(window.MeridianAdminUI)
            : null;

        const localTime =
            formatter
            ? formatter(
                this.currentSession,
                false
            )
            : "";

        const timezone =
            String(
                this.currentSession
                && this.currentSession.geoLocation
                && this.currentSession.geoLocation.timezone
                || ""
            )
            .trim();

        this.localTime.textContent =
            localTime
            ? `${localTime}${timezone ? ` (${timezone})` : ""}`
            : "待识别";
    },


    renderCurrentSession(session) {
        this.currentSession =
            session || null;

        if (!this.panel) {
            return;
        }

        if (!session) {
            this.panel.hidden = true;
            return;
        }

        this.panel.hidden = false;

        if (this.currentUserId) {
            this.currentUserId.textContent =
                session.userId
                || "Unknown visitor";
        }

        const ipAddress =
            String(
                session.ipAddress || ""
            )
            .trim();

        if (this.ipAddress) {
            this.ipAddress.textContent =
                ipAddress || "未记录";
        }

        if (this.ipHint) {
            const exactCount =
                Number(
                    session.sameIpSessionCount
                    || 0
                );

            const sameIpCount =
                exactCount > 0
                ? exactCount
                : ipAddress
                    && window.MeridianAdminUI
                    && typeof window.MeridianAdminUI
                        .getSameIpCount === "function"
                    ? window.MeridianAdminUI
                        .getSameIpCount(ipAddress)
                    : 0;

            this.ipHint.textContent =
                sameIpCount > 1
                ? `同 IP 会话：${sameIpCount}`
                : "";
        }

        if (this.location) {
            const formatter =
                window.MeridianAdminUI
                && typeof window.MeridianAdminUI
                    .formatVisitorLocation === "function"
                ? window.MeridianAdminUI
                    .formatVisitorLocation
                    .bind(window.MeridianAdminUI)
                : null;

            const location =
                formatter
                ? formatter(session, false)
                : "";

            this.location.textContent =
                location || "待识别";
        }

        this.refreshCurrentLocalTime();

        if (this.userAgent) {
            const userAgent =
                String(
                    session.userAgent || ""
                )
                .trim();

            this.userAgent.textContent =
                userAgent
                ? `设备：${userAgent}`
                : "";
            this.userAgent.title =
                userAgent;
        }

        const lead =
            session.leadIntent
            || {
                level: "low",
                score: 0,
                reasons: [
                    "尚未形成明确交易意图"
                ]
            };

        if (this.intentBadge) {
            this.intentBadge.className =
                `admin-lead-intent-badge intent-${lead.level || "low"}`;
            this.intentBadge.textContent =
                `${String(lead.level || "low").toUpperCase()} · ${Number(lead.score || 0)}`;
        }

        if (this.intentReasons) {
            this.intentReasons.innerHTML = "";

            (lead.reasons || [])
            .forEach(reason => {
                const item =
                    document.createElement(
                        "li"
                    );
                item.textContent = reason;
                this.intentReasons.appendChild(
                    item
                );
            });
        }

        if (this.prioritySelect) {
            this.prioritySelect.value =
                session.priority
                || "normal";
        }

        if (this.followUpSelect) {
            this.followUpSelect.value =
                session.followUpStatus
                || "not_followed_up";
        }

        if (this.followUpMeta) {
            this.followUpMeta.textContent =
                session.followUpUpdatedAt
                ? `更新时间：${new Date(session.followUpUpdatedAt).toLocaleString()}`
                : "尚未人工跟进";
        }

        this.renderTagChips();
        this.setMessage("");
    },

    renderTagChips() {
        if (!this.currentSession) {
            return;
        }

        if (this.manualTags) {
            this.manualTags.innerHTML = "";

            const tags =
                Array.isArray(
                    this.currentSession.tags
                )
                ? this.currentSession.tags
                : [];

            if (!tags.length) {
                const empty =
                    document.createElement(
                        "span"
                    );
                empty.className =
                    "admin-lead-empty-tag";
                empty.textContent =
                    "暂无手动标签";
                this.manualTags.appendChild(
                    empty
                );
            }

            tags.forEach(tag => {
                const chip =
                    document.createElement(
                        "span"
                    );
                chip.className =
                    "admin-lead-tag manual";

                const label =
                    document.createElement(
                        "span"
                    );
                label.textContent = tag;

                const remove =
                    document.createElement(
                        "button"
                    );
                remove.type = "button";
                remove.setAttribute(
                    "aria-label",
                    `删除标签 ${tag}`
                );
                remove.textContent = "×";
                remove.addEventListener(
                    "click",
                    () => {
                        this.removeTag(tag);
                    }
                );

                chip.appendChild(label);
                chip.appendChild(remove);
                this.manualTags.appendChild(
                    chip
                );
            });
        }

        if (this.autoTags) {
            this.autoTags.innerHTML = "";

            const tags =
                Array.isArray(
                    this.currentSession.autoTags
                )
                ? this.currentSession.autoTags
                : [];

            if (!tags.length) {
                const empty =
                    document.createElement(
                        "span"
                    );
                empty.className =
                    "admin-lead-empty-tag";
                empty.textContent =
                    "暂无自动标签";
                this.autoTags.appendChild(
                    empty
                );
            }

            tags.forEach(tag => {
                const chip =
                    document.createElement(
                        "span"
                    );
                chip.className =
                    "admin-lead-tag automatic";
                chip.textContent = tag;
                this.autoTags.appendChild(
                    chip
                );
            });
        }
    },

    setEditorDisabled(disabled) {
        const value =
            disabled === true;

        if (this.prioritySelect) {
            this.prioritySelect.disabled =
                value;
        }

        if (this.followUpSelect) {
            this.followUpSelect.disabled =
                value;
        }

        if (this.tagInput) {
            this.tagInput.disabled =
                value;
        }

        if (this.addTagButton) {
            this.addTagButton.disabled =
                value;
        }

        if (this.manualTags) {
            this.manualTags
            .querySelectorAll("button")
            .forEach(button => {
                button.disabled = value;
            });
        }
    },

    addTag() {
        if (
            !this.currentSession
            || !this.tagInput
        ) {
            return;
        }

        const tag =
            this.tagInput.value.trim();

        if (!tag) {
            return;
        }

        if (tag.length > 30) {
            this.setMessage(
                "标签最多 30 个字符。",
                true
            );
            return;
        }

        const tags =
            Array.isArray(
                this.currentSession.tags
            )
            ? this.currentSession.tags.slice()
            : [];

        if (
            tags.some(
                item =>
                    item.toLocaleLowerCase()
                    === tag.toLocaleLowerCase()
            )
        ) {
            this.setMessage(
                "该标签已经存在。",
                true
            );
            return;
        }

        if (tags.length >= 12) {
            this.setMessage(
                "每个会话最多 12 个标签。",
                true
            );
            return;
        }

        tags.push(tag);
        this.tagInput.value = "";
        this.updateLabels({
            tags
        });
    },

    removeTag(tag) {
        if (!this.currentSession) {
            return;
        }

        const tags =
            (
                this.currentSession.tags
                || []
            )
            .filter(
                item => item !== tag
            );

        this.updateLabels({
            tags
        });
    },

    async updateFollowUp(status) {
        if (
            !this.currentSession
            || this.followUpSaving
        ) {
            return;
        }

        const userId =
            this.currentSession.userId;

        const previousStatus =
            this.currentSession
            .followUpStatus
            || "not_followed_up";

        this.followUpSaving = true;
        this.setEditorDisabled(true);
        this.setMessage(
            "正在保存跟进状态…"
        );

        try {
            const response =
                await fetch(
                    `/api/admin/sessions/${encodeURIComponent(userId)}/follow-up`,
                    {
                        method: "PATCH",
                        credentials:
                            "same-origin",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify({
                                status
                            })
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

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message
                    || "Unable to update follow-up status."
                );
            }

            this.currentSession =
                result.session;

            const existing =
                MeridianAdminState
                .getConversationSessionByUserId(
                    userId
                );

            if (existing) {
                Object.assign(
                    existing,
                    result.session
                );
            }

            MeridianAdminState.selectSession(
                result.session
            );
            MeridianAdminUI.renderSessions(
                false
            );
            this.renderCurrentSession(
                result.session
            );
            this.setMessage(
                "跟进状态已保存。"
            );
            this.scheduleReload(150);

            if (
                window.MeridianAdminFunnel
                && window.MeridianAdminFunnel
                .isReady()
            ) {
                window.MeridianAdminFunnel
                .scheduleReload(150);
            }
        }
        catch (error) {
            console.error(
                "Admin follow-up update failed:",
                error
            );

            if (this.followUpSelect) {
                this.followUpSelect.value =
                    previousStatus;
            }

            this.setMessage(
                error.message
                || "跟进状态保存失败。",
                true
            );
        }
        finally {
            this.followUpSaving = false;
            this.setEditorDisabled(false);
        }
    },

    async updateLabels(payload) {
        if (
            !this.currentSession
            || this.labelSaving
        ) {
            return;
        }

        const userId =
            this.currentSession.userId;

        this.labelSaving = true;
        this.setEditorDisabled(true);
        this.setMessage(
            "正在保存…"
        );

        try {
            const response =
                await fetch(
                    `/api/admin/sessions/${encodeURIComponent(userId)}/labels`,
                    {
                        method: "PATCH",
                        credentials:
                            "same-origin",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body:
                            JSON.stringify(payload)
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

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message
                    || "Unable to update labels."
                );
            }

            this.currentSession =
                result.session;

            const existing =
                MeridianAdminState
                .getConversationSessionByUserId(
                    userId
                );

            if (existing) {
                Object.assign(
                    existing,
                    result.session
                );
            }

            MeridianAdminState.selectSession(
                result.session
            );
            MeridianAdminUI.renderSessions(
                false
            );
            this.renderCurrentSession(
                result.session
            );
            this.setMessage(
                "已保存。"
            );
            this.scheduleReload(150);
        }
        catch (error) {
            console.error(
                "Admin labels update failed:",
                error
            );
            this.setMessage(
                error.message
                || "标签保存失败。",
                true
            );

            if (
                this.prioritySelect
                && this.currentSession
            ) {
                this.prioritySelect.value =
                    this.currentSession.priority
                    || "normal";
            }
        }
        finally {
            this.labelSaving = false;
            this.setEditorDisabled(false);
        }
    }
};
