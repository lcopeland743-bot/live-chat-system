/**
 * Meridian Admin Lead Management Test
 *
 * Version:
 * v2.4.2
 */

const assert =
require("assert");


const fs =
require("fs");


const path =
require("path");


const vm =
require("vm");


const Module =
require("module");


const Session = {
    aggregate: null,
    distinct: null,
    findOne: null,
    findOneAndUpdate: null
};


const originalModuleLoad =
Module._load;


Module._load =
function(request, parent, isMain) {
    const fromAdminSessionQueryService =
        parent
        && /admin-session-query-service\.js$/
        .test(parent.filename);

    if (
        fromAdminSessionQueryService
        && request ===
            "../database/models/session-model"
    ) {
        return Session;
    }

    return originalModuleLoad(
        request,
        parent,
        isMain
    );
};


const service =
require(
    "../server/services/admin-session-query-service"
);


Module._load =
originalModuleLoad;


function read(relativePath) {
    return fs.readFileSync(
        path.join(
            __dirname,
            "..",
            relativePath
        ),
        "utf8"
    );
}


function runAdminStatePaginationTest() {
    const source =
        read(
            "public/js/admin/admin-state.js"
        );

    const storage =
        new Map();

    const context = {
        console,
        localStorage: {
            getItem: key =>
                storage.has(key)
                ? storage.get(key)
                : null,
            setItem: (key, value) =>
                storage.set(key, value),
            removeItem: key =>
                storage.delete(key)
        },
        window: {}
    };

    vm.createContext(context);
    vm.runInContext(
        source,
        context
    );

    const state =
        context.window
        .MeridianAdminState;

    state.setSessions(
        [
            {
                userId: "high_intent_old",
                updatedAt:
                    "2026-01-01T00:00:00.000Z",
                leadIntent: {
                    level: "high",
                    score: 90
                }
            },
            {
                userId: "low_intent_new",
                updatedAt:
                    "2026-07-01T00:00:00.000Z",
                leadIntent: {
                    level: "low",
                    score: 10
                }
            }
        ],
        {
            preserveOrder: true
        }
    );

    assert.deepStrictEqual(
        state.getSessions()
        .map(item => item.userId),
        [
            "high_intent_old",
            "low_intent_new"
        ],
        "server-side intent ordering must not be overwritten in the browser"
    );

    state.selectSession({
        userId: "persist_current",
        socketId: "socket_current",
        status: "offline",
        aiMode: "auto"
    });

    state.setSessions(
        [
            {
                userId: "another_page",
                updatedAt:
                    "2026-07-02T00:00:00.000Z"
            }
        ],
        {
            preserveCurrent: true,
            preserveOrder: true
        }
    );

    assert.strictEqual(
        state.getCurrentConversationId(),
        "persist_current",
        "pagination and filters must not close the selected conversation"
    );
}


function createHighIntentSession() {
    return {
        userId:
            "lead_high_1",
        priority:
            "high",
        tags: [
            "重点跟进"
        ],
        followUpStatus:
            "contacted",
        conversionState: {
            asset:
                "NVDA",
            intent:
                "entry_plan",
            investmentHorizon:
                "short_term",
            positionStatus:
                "holding",
            entryPlan:
                "staged_entry",
            engagementScore:
                75,
            engagementSignal:
                "engaged",
            exitRisk:
                "low",
            ctaShownCount:
                1,
            aiReplyCount:
                4,
            whatsappClicked:
                true,
            doNotPush:
                false
        }
    };
}


async function run() {
    runAdminStatePaginationTest();

    const normalized =
        service.normalizeListOptions({
            q:
                "  NVDA  ",
            status:
                "ONLINE",
            aiMode:
                "invalid",
            intentLevel:
                "HIGH",
            followUpStatus:
                "CONTACTED",
            page:
                "0",
            limit:
                "500",
            sort:
                "intent"
        });

    assert.strictEqual(
        normalized.q,
        "NVDA"
    );
    assert.strictEqual(
        normalized.status,
        "online"
    );
    assert.strictEqual(
        normalized.aiMode,
        "all"
    );
    assert.strictEqual(
        normalized.intentLevel,
        "high"
    );
    assert.strictEqual(
        normalized.followUpStatus,
        "contacted"
    );
    assert.strictEqual(
        normalized.page,
        1
    );
    assert.strictEqual(
        normalized.limit,
        100
    );
    assert.strictEqual(
        normalized.sort,
        "intent"
    );

    const highIntent =
        service.deriveLeadProfile(
            createHighIntentSession()
        );

    assert.strictEqual(
        highIntent.level,
        "high"
    );
    assert.strictEqual(
        highIntent.score,
        100
    );
    assert.ok(
        highIntent.reasons.includes(
            "已点击 WhatsApp"
        )
    );
    assert.ok(
        highIntent.reasons.includes(
            "已有持仓"
        )
    );

    const clickedIntent =
        service.deriveLeadProfile({
            conversionState: {
                whatsappClicked: true
            }
        });

    assert.strictEqual(
        clickedIntent.level,
        "high",
        "a WhatsApp click should be treated as high intent"
    );

    const blockedIntent =
        service.deriveLeadProfile({
            conversionState: {
                whatsappClicked:
                    true,
                positionStatus:
                    "holding",
                engagementScore:
                    100,
                doNotPush:
                    true
            }
        });

    assert.deepStrictEqual(
        blockedIntent,
        {
            level:
                "low",
            score:
                0,
            reasons: [
                "客户已标记为禁止推送"
            ]
        }
    );

    const autoTags =
        service.deriveAutoTags(
            createHighIntentSession()
        );

    assert.ok(
        autoTags.includes(
            "短线交易者"
        )
    );
    assert.ok(
        autoTags.includes(
            "已持仓"
        )
    );
    assert.ok(
        autoTags.includes(
            "NVDA"
        )
    );
    assert.ok(
        autoTags.includes(
            "WhatsApp已点击"
        )
    );
    assert.ok(
        autoTags.includes(
            "已联系"
        )
    );

    assert.deepStrictEqual(
        service.buildAutomaticTagMatch(
            "已持仓"
        ),
        {
            "conversionState.positionStatus":
                "holding"
        }
    );

    assert.deepStrictEqual(
        service.normalizeTags([
            "重点跟进",
            "  已联系  ",
            "重点跟进",
            "已联系"
        ]),
        [
            "重点跟进",
            "已联系"
        ]
    );

    assert.throws(
        () =>
            service.normalizeTags([
                "bad\nlabel"
            ]),
        error =>
            error.code ===
            "INVALID_TAG_CHARACTERS"
    );

    assert.strictEqual(
        service.normalizeFollowUpStatus(
            "JOINED_WHATSAPP"
        ),
        "joined_whatsapp"
    );

    assert.throws(
        () =>
            service.normalizeFollowUpStatus(
                "invalid_status"
            ),
        error =>
            error.code ===
            "INVALID_FOLLOW_UP_STATUS"
    );

    assert.throws(
        () =>
            service.normalizeTags(
                new Array(13)
                .fill(0)
                .map((_, index) =>
                    `标签${index}`
                )
            ),
        error =>
            error.code ===
            "TOO_MANY_TAGS"
    );

    const options =
        service.normalizeListOptions({
            page: 2,
            limit: 25,
            status: "online",
            unread: "unread",
            intentLevel: "high",
            whatsapp: "clicked",
            priority: "vip",
            followUpStatus:
                "contacted",
            q: "AAPL",
            tag: "重点",
            sort: "intent"
        });

    const pipeline =
        service.buildListPipeline(
            options
        );

    assert.ok(
        pipeline.some(
            stage => stage.$facet
        ),
        "query should use server-side facet pagination"
    );

    const facet =
        pipeline.find(
            stage => stage.$facet
        ).$facet;

    assert.ok(
        facet.sessions.some(
            stage => stage.$skip === 25
        ),
        "second page should skip the first page"
    );
    assert.ok(
        facet.sessions.some(
            stage => stage.$limit === 25
        ),
        "page size should be enforced in MongoDB"
    );
    assert.ok(
        facet.sessions.some(
            stage =>
                stage.$match
                && stage.$match._leadLevel
                    === "high"
        ),
        "intent level should be filtered in the paginated MongoDB facet"
    );
    assert.ok(
        !facet.intentSummary.some(
            stage =>
                stage.$match
                && stage.$match._leadLevel
        ),
        "intent summary should count all levels before the level filter"
    );

    const leadScoreStage =
        pipeline.find(
            stage =>
                stage.$set
                && stage.$set._leadScore
        );

    assert.deepStrictEqual(
        leadScoreStage.$set
        ._leadScore.$cond[0],
        {
            $eq: [
                "$conversionState.doNotPush",
                true
            ]
        },
        "do-not-push sessions must be forced to low intent in MongoDB"
    );

    const originalAggregate =
        Session.aggregate;
    const originalDistinct =
        Session.distinct;
    const originalFindOne =
        Session.findOne;
    const originalFindOneAndUpdate =
        Session.findOneAndUpdate;

    let capturedPipeline = null;
    let capturedUpdate = null;

    Session.aggregate =
        async queryPipeline => {
            capturedPipeline =
                queryPipeline;

            return [
                {
                    sessions: [
                        {
                            ...createHighIntentSession(),
                            status:
                                "online",
                            aiMode:
                                "auto",
                            messageCount:
                                5,
                            lastMessage:
                                "Should I add NVDA?",
                            updatedAt:
                                new Date()
                        }
                    ],
                    metadata: [
                        {
                            total: 1
                        }
                    ],
                    intentSummary: [
                        {
                            _id: "high",
                            count: 1
                        }
                    ]
                }
            ];
        };

    Session.distinct =
        async () => [
            "重点跟进",
            "已联系",
            "重点跟进"
        ];

    Session.findOne =
        async query => ({
            ...createHighIntentSession(),
            userId:
                query.userId
        });

    Session.findOneAndUpdate =
        async (query, update) => {
            capturedUpdate = {
                query,
                update
            };

            return {
                ...createHighIntentSession(),
                userId:
                    query.userId,
                ...update.$set
            };
        };

    try {
        const listed =
            await service.listSessions({
                intentLevel:
                    "high",
                page: 1,
                limit: 25
            });

        assert.ok(
            Array.isArray(capturedPipeline)
        );
        assert.strictEqual(
            listed.sessions.length,
            1
        );
        assert.strictEqual(
            listed.sessions[0]
            .leadIntent.level,
            "high"
        );
        assert.ok(
            listed.sessions[0]
            .autoTags.includes("NVDA")
        );
        assert.deepStrictEqual(
            listed.pagination,
            {
                page: 1,
                limit: 25,
                total: 1,
                totalPages: 1,
                hasPrevious: false,
                hasNext: false
            }
        );
        assert.deepStrictEqual(
            listed.intentSummary,
            {
                high: 1,
                medium: 0,
                low: 0
            }
        );
        assert.ok(
            listed.knownTags.includes(
                "已联系"
            )
        );
        assert.ok(
            listed.knownTags.includes(
                "重点跟进"
            )
        );
        assert.ok(
            listed.knownTags.includes(
                "短线交易者"
            )
        );
        assert.ok(
            listed.knownTags.includes(
                "WhatsApp已点击"
            )
        );

        const single =
            await service.getSession(
                "lead_high_2"
            );

        assert.strictEqual(
            single.userId,
            "lead_high_2"
        );
        assert.strictEqual(
            single.leadIntent.level,
            "high"
        );

        const updated =
            await service.updateLabels(
                "lead_high_1",
                {
                    tags: [
                        "重点跟进",
                        "已联系",
                        "重点跟进"
                    ],
                    priority:
                        "vip"
                }
            );

        assert.deepStrictEqual(
            capturedUpdate.update.$set,
            {
                tags: [
                    "重点跟进",
                    "已联系"
                ],
                priority:
                    "vip"
            }
        );
        assert.strictEqual(
            updated.priority,
            "vip"
        );
        assert.strictEqual(
            updated.leadIntent.level,
            "high"
        );

        const followUpResult =
            await service.updateFollowUp(
                "lead_high_1",
                {
                    status:
                        "joined_whatsapp",
                    updatedBy:
                        "local-admin"
                }
            );

        assert.strictEqual(
            followUpResult.previousStatus,
            "contacted"
        );
        assert.strictEqual(
            capturedUpdate.update.$set
            .followUpStatus,
            "joined_whatsapp"
        );
        assert.strictEqual(
            capturedUpdate.update.$set
            .followUpUpdatedBy,
            "local-admin"
        );
        assert.strictEqual(
            followUpResult.session
            .followUpStatus,
            "joined_whatsapp"
        );
    }
    finally {
        Session.aggregate =
            originalAggregate;
        Session.distinct =
            originalDistinct;
        Session.findOne =
            originalFindOne;
        Session.findOneAndUpdate =
            originalFindOneAndUpdate;
    }

    const serverSource =
        read("server.js");
    const htmlSource =
        read("server/views/admin.html");
    const adminSource =
        read("public/js/admin/admin.js");
    const socketSource =
        read("public/js/admin/admin-socket.js");
    const modelSource =
        read("server/database/models/session-model.js");
    const packageJson =
        JSON.parse(
            read("package.json")
        );

    assert.match(
        serverSource,
        /\/api\/admin\/sessions/
    );
    assert.match(
        serverSource,
        /admin-session-route/
    );
    assert.match(
        htmlSource,
        /id="adminSessionSearch"/
    );
    assert.match(
        htmlSource,
        /id="adminLeadPanel"/
    );
    assert.match(
        htmlSource,
        /admin-leads\.js/
    );
    assert.match(
        adminSource,
        /MeridianAdminLeads\.init/
    );
    assert.match(
        socketSource,
        /MeridianAdminLeads/
    );
    assert.match(
        modelSource,
        /admin_session_filter_lookup/
    );
    assert.match(
        modelSource,
        /admin_session_intent_lookup/
    );
    assert.match(
        modelSource,
        /admin_session_follow_up_lookup/
    );
    assert.strictEqual(
        packageJson.version,
        "2.4.2"
    );
    assert.strictEqual(
        packageJson.scripts[
            "test:lead-management"
        ],
        "node tests/admin-lead-management.test.js"
    );

    console.log(
        "Admin Lead Management v2.4.2 tests passed."
    );
}


run()
.catch(error => {
    console.error(error);
    process.exitCode = 1;
});
