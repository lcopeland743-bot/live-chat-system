/**
 * Meridian Admin Funnel Analytics Test
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


const Module =
require("module");


const ConversionEvent = {
    aggregate: null,
    create: null,
    findOne: null
};


const Session = {
    find: null,
    aggregate: null,
    distinct: null,
    findOne: null,
    findOneAndUpdate: null
};


const originalModuleLoad =
Module._load;


Module._load =
function(request, parent, isMain) {
    const filename =
        parent
        && parent.filename
        || "";

    if (
        /admin-funnel-service\.js$/
        .test(filename)
        && request ===
            "../database/models/conversion-event-model"
    ) {
        return ConversionEvent;
    }

    if (
        /admin-funnel-service\.js$/
        .test(filename)
        && request ===
            "../database/models/session-model"
    ) {
        return Session;
    }

    if (
        /admin-session-query-service\.js$/
        .test(filename)
        && request ===
            "../database/models/session-model"
    ) {
        return Session;
    }

    if (
        /conversion-analytics-service\.js$/
        .test(filename)
        && request ===
            "../database/models/conversion-event-model"
    ) {
        return ConversionEvent;
    }

    return originalModuleLoad(
        request,
        parent,
        isMain
    );
};


const funnelService =
require(
    "../server/services/admin-funnel-service"
);


const conversionAnalyticsService =
require(
    "../server/services/conversion-analytics-service"
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


function createRows() {
    return [
        {
            _id:
                "funnel-user-a",
            hasConversation: 1,
            hasValue: 1,
            hasCtaShown: 1,
            hasCtaClicked: 1,
            hasHumanTakeover: 1,
            hasFollowUpContacted: 1,
            hasJoinedWhatsapp: 1,
            hasConverted: 1,
            latestAsset:
                "NVDA",
            latestIntent:
                "entry_plan",
            latestLanguage:
                "en",
            latestAiMode:
                "auto"
        },
        {
            _id:
                "funnel-user-b",
            hasConversation: 1,
            hasValue: 1,
            hasCtaShown: 1,
            hasCtaClicked: 1,
            hasHumanTakeover: 1,
            hasFollowUpContacted: 1,
            hasJoinedWhatsapp: 0,
            hasConverted: 0,
            latestAsset:
                "TSLA",
            latestIntent:
                "position_review",
            latestLanguage:
                "zh",
            latestAiMode:
                "assist"
        },
        {
            _id:
                "funnel-user-c",
            hasConversation: 1,
            hasValue: 0,
            hasCtaShown: 0,
            hasCtaClicked: 0,
            hasHumanTakeover: 0,
            hasFollowUpContacted: 0,
            hasJoinedWhatsapp: 0,
            hasConverted: 0,
            latestAsset:
                "AAPL",
            latestIntent:
                "unknown",
            latestLanguage:
                "unknown",
            latestAiMode:
                "unknown"
        }
    ];
}


function createSessions(now) {
    return [
        {
            userId:
                "funnel-user-a",
            followUpStatus:
                "converted",
            followUpUpdatedAt:
                now,
            aiMode:
                "auto",
            conversionState: {
                whatsappClicked:
                    true,
                asset:
                    "NVDA",
                positionStatus:
                    "holding",
                engagementScore:
                    80,
                engagementSignal:
                    "closing"
            }
        },
        {
            userId:
                "funnel-user-b",
            followUpStatus:
                "contacted",
            followUpUpdatedAt:
                now,
            aiMode:
                "assist",
            conversionState: {
                whatsappClicked:
                    true,
                asset:
                    "TSLA",
                engagementScore:
                    40,
                engagementSignal:
                    "interested"
            }
        },
        {
            userId:
                "funnel-user-c",
            followUpStatus:
                "invalid",
            followUpUpdatedAt:
                now,
            aiMode:
                "auto",
            conversionState: {
                asset:
                    "AAPL",
                engagementScore:
                    5,
                engagementSignal:
                    "neutral"
            }
        }
    ];
}


async function run() {
    const now =
        new Date(
            "2026-07-24T12:00:00.000Z"
        );

    const normalized =
        funnelService
        .normalizeOptions(
            {
                range:
                    "7D",
                language:
                    "ZH",
                aiMode:
                    "AUTO",
                leadLevel:
                    "HIGH",
                followUpStatus:
                    "CONTACTED",
                asset:
                    "  NVDA  ",
                intent:
                    " entry "
            },
            now
        );

    assert.strictEqual(
        normalized.range,
        "7d"
    );
    assert.strictEqual(
        normalized.language,
        "zh"
    );
    assert.strictEqual(
        normalized.aiMode,
        "auto"
    );
    assert.strictEqual(
        normalized.leadLevel,
        "high"
    );
    assert.strictEqual(
        normalized.followUpStatus,
        "contacted"
    );
    assert.strictEqual(
        normalized.asset,
        "NVDA"
    );
    assert.strictEqual(
        normalized.intent,
        "entry"
    );
    assert.strictEqual(
        normalized.start
        .toISOString(),
        "2026-07-17T12:00:00.000Z"
    );

    const custom =
        funnelService
        .resolveDateRange(
            {
                range:
                    "custom",
                start:
                    "2026-07-01",
                end:
                    "2026-07-07"
            },
            now
        );

    assert.strictEqual(
        custom.start
        .toISOString(),
        "2026-07-01T00:00:00.000Z"
    );
    assert.strictEqual(
        custom.endExclusive
        .toISOString(),
        "2026-07-08T00:00:00.000Z"
    );

    assert.throws(
        () =>
            funnelService
            .resolveDateRange(
                {
                    range:
                        "custom",
                    start:
                        "2026-07-10",
                    end:
                        "2026-07-01"
                },
                now
            ),
        error =>
            error.code ===
            "INVALID_FUNNEL_DATE_RANGE"
    );

    const pipeline =
        funnelService
        .buildUserPipeline(
            funnelService
            .normalizeOptions(
                {
                    range:
                        "30d"
                },
                now
            )
        );

    assert.ok(
        pipeline.some(
            stage =>
                stage.$group
                && stage.$group
                    .hasCtaClicked
        ),
        "funnel pipeline must aggregate unique CTA clicks"
    );

    assert.ok(
        pipeline.some(
            stage =>
                stage.$group
                && stage.$group
                    .hasFollowUpContacted
        ),
        "funnel pipeline must aggregate manual follow-up events"
    );

    const originalAggregate =
        ConversionEvent.aggregate;
    const originalCreate =
        ConversionEvent.create;
    const originalFindOne =
        ConversionEvent.findOne;
    const originalSessionFind =
        Session.find;

    let capturedCreate = null;

    ConversionEvent.aggregate =
        async pipelineValue => {
            const isDaily =
                pipelineValue.some(
                    stage =>
                        stage.$group
                        && stage.$group._id
                        && stage.$group._id.day
                );

            return isDaily
                ? [
                    {
                        _id: {
                            day:
                                "2026-07-23",
                            eventType:
                                "user_turn"
                        },
                        count: 3
                    },
                    {
                        _id: {
                            day:
                                "2026-07-23",
                            eventType:
                                "cta_clicked"
                        },
                        count: 2
                    }
                ]
                : createRows();
        };

    Session.find =
        () => ({
            select() {
                return this;
            },
            lean() {
                return Promise.resolve(
                    createSessions(now)
                );
            }
        });

    ConversionEvent.create =
        async payload => {
            capturedCreate = payload;
            return payload;
        };

    ConversionEvent.findOne =
        query => ({
            sort() {
                return this;
            },
            select() {
                return this;
            },
            lean() {
                return Promise.resolve({
                    ...query,
                    language:
                        "en",
                    aiMode:
                        "auto"
                });
            }
        });

    try {
        const result =
            await funnelService
            .getFunnel(
                {
                    range:
                        "30d"
                },
                now
            );

        assert.deepStrictEqual(
            result.counts,
            {
                conversations: 3,
                valueDelivered: 2,
                ctaShown: 2,
                ctaClicked: 2,
                contacted: 2,
                joinedWhatsapp: 1,
                converted: 1
            }
        );

        assert.strictEqual(
            result.stages[4]
            .previousRate,
            100
        );
        assert.strictEqual(
            result.stages[5]
            .previousRate,
            50
        );
        assert.strictEqual(
            result.followUpSummary
            .converted,
            1
        );
        assert.strictEqual(
            result.followUpSummary
            .invalid,
            1
        );
        assert.deepStrictEqual(
            result.topAssets
            .map(item => item.name),
            [
                "AAPL",
                "NVDA",
                "TSLA"
            ]
        );
        assert.strictEqual(
            result.daily[0]
            .conversations,
            3
        );
        assert.strictEqual(
            result.daily[0]
            .ctaClicked,
            2
        );
        assert.strictEqual(
            result.dataQuality
            .unknownLanguageUsers,
            1
        );

        const convertedOnly =
            await funnelService
            .getFunnel(
                {
                    range:
                        "30d",
                    followUpStatus:
                        "converted"
                },
                now
            );

        assert.strictEqual(
            convertedOnly.counts
            .conversations,
            1
        );
        assert.strictEqual(
            convertedOnly.counts
            .converted,
            1
        );

        assert.strictEqual(
            conversionAnalyticsService
            .normalizeLanguage(
                "zh-CN"
            ),
            "zh"
        );
        assert.strictEqual(
            conversionAnalyticsService
            .normalizeLanguage(
                "French"
            ),
            "other"
        );
        assert.strictEqual(
            conversionAnalyticsService
            .normalizeAiMode(
                "AUTO"
            ),
            "auto"
        );

        await conversionAnalyticsService
        .record({
            userId:
                "analytics-user",
            sessionId:
                "analytics-user",
            eventType:
                "cta_shown",
            language:
                "en-US",
            aiMode:
                "AUTO"
        });

        assert.strictEqual(
            capturedCreate.language,
            "en"
        );
        assert.strictEqual(
            capturedCreate.aiMode,
            "auto"
        );

        const context =
            await conversionAnalyticsService
            .findCtaContext(
                "analytics-user",
                "tracking-1"
            );

        assert.strictEqual(
            context.language,
            "en"
        );
    }
    finally {
        ConversionEvent.aggregate =
            originalAggregate;
        ConversionEvent.create =
            originalCreate;
        ConversionEvent.findOne =
            originalFindOne;
        Session.find =
            originalSessionFind;
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
    const eventModelSource =
        read("server/database/models/conversion-event-model.js");
    const sessionRouteSource =
        read("server/routes/admin-session-route.js");
    const packageJson =
        JSON.parse(
            read("package.json")
        );

    assert.match(
        serverSource,
        /admin-funnel-route/
    );
    assert.match(
        serverSource,
        /\/api\/admin\/funnel/
    );
    assert.match(
        htmlSource,
        /id="adminFunnelPanel"/
    );
    assert.match(
        htmlSource,
        /id="adminLeadFollowUpStatus"/
    );
    assert.match(
        htmlSource,
        /admin-funnel\.js/
    );
    assert.match(
        adminSource,
        /MeridianAdminFunnel\.init/
    );
    assert.match(
        socketSource,
        /MeridianAdminFunnel/
    );
    assert.match(
        modelSource,
        /followUpStatus/
    );
    assert.match(
        modelSource,
        /admin_session_follow_up_lookup/
    );
    assert.match(
        eventModelSource,
        /follow_up_updated/
    );
    assert.match(
        eventModelSource,
        /conversion_funnel_filter_lookup/
    );
    assert.match(
        sessionRouteSource,
        /\/:userId\/follow-up/
    );
    assert.strictEqual(
        packageJson.version,
        "2.4.2"
    );
    assert.strictEqual(
        packageJson.scripts[
            "test:funnel"
        ],
        "node tests/admin-funnel-analytics.test.js"
    );

    console.log(
        "Admin WhatsApp Funnel v2.4.2 tests passed."
    );
}


run()
.catch(error => {
    console.error(error);
    process.exitCode = 1;
});
