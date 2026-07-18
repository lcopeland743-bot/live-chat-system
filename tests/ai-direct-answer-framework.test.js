const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
    spawnSync
}
=
require("child_process");


delete process.env.AI_REPLY_CHARACTER_LIMIT;


const projectRoot = path.resolve(__dirname, "..");

const conversionConfig =
require("../server/config/conversion-config");

const schemas =
require("../server/schemas/conversion-response-schema");

const answerQuality =
require("../server/services/ai-answer-quality-service");

const {
    countCharacters
}
=
require("../server/utils/conversion-text");


assert.strictEqual(
    conversionConfig.replyCharacterLimit,
    200,
    "Default visible AI reply limit must be 200 characters"
);

const staleLimitCheck = spawnSync(
    process.execPath,
    [
        "-e",
        "process.env.AI_REPLY_CHARACTER_LIMIT='100';"
        + "const c=require('./server/config/conversion-config');"
        + "process.stdout.write(String(c.replyCharacterLimit));"
    ],
    {
        cwd: projectRoot,
        encoding: "utf8"
    }
);

assert.strictEqual(
    staleLimitCheck.status,
    0,
    staleLimitCheck.stderr
);

assert.strictEqual(
    staleLimitCheck.stdout,
    "200",
    "A stale 100-character environment value must not override the 200-character product rule"
);

assert.strictEqual(
    conversionConfig.promptVersion,
    "1.2.1",
    "Precision hotfix must use prompt version 1.2.1"
);

assert.strictEqual(
    conversionConfig.policyVersion,
    "1.1.0",
    "WhatsApp conversion policy version must remain unchanged"
);

assert.strictEqual(
    schemas.conversionResponseSchema
        .properties.replyText.maxLength,
    200,
    "Primary structured reply schema must allow 200 characters"
);

assert.strictEqual(
    schemas.compressionResponseSchema
        .properties.replyText.maxLength,
    200,
    "Compression schema must use the same 200-character limit"
);

assert.strictEqual(
    schemas.languageRepairResponseSchema
        .properties.replyText.maxLength,
    200,
    "Language repair schema must use the same 200-character limit"
);

assert.strictEqual(
    schemas.directAnswerRepairResponseSchema
        .properties.replyText.maxLength,
    200,
    "Direct-answer repair schema must use the same limit"
);


const classificationCases = [
    [
        "sector to buy for long term",
        "sector_selection"
    ],
    [
        "Which sector should I watch now?",
        "sector_selection"
    ],
    [
        "长期投资应该关注什么板块？",
        "sector_selection"
    ],
    [
        "AI stocks or energy stocks?",
        "asset_comparison"
    ],
    [
        "Which is better, NVDA or AMD?",
        "asset_comparison"
    ],
    [
        "What should I buy today?",
        "asset_selection"
    ],
    [
        "Why is NVDA falling?",
        "explanation"
    ]
];

classificationCases.forEach(([message, expected]) => {
    const result = answerQuality.classifyRequest(message);

    assert.strictEqual(
        result.kind,
        expected,
        `Unexpected classification for: ${message}`
    );

    assert.strictEqual(
        result.requiresDirectAnswer,
        true,
        `Direct answer should be required for: ${message}`
    );
});


const vagueSectorAnswer =
    answerQuality.evaluate({
        latestMessage:
            "sector to buy for long term",
        replyText:
            "The key signal is confirmation, not price alone. Check timing and risk before acting.",
        characterLimit:
            200
    });

assert.strictEqual(
    vagueSectorAnswer.needsRepair,
    true,
    "A vague sector answer must be rejected"
);

assert.ok(
    vagueSectorAnswer.reasons.includes(
        "missing_specific_sector_answer"
    ),
    "A sector question must require concrete sectors or an explicit limitation"
);


const broadSectorAnswer =
    answerQuality.evaluate({
        latestMessage:
            "sector to buy for long term",
        replyText:
            "Prioritize technology for long-term research; AI adoption supports growth, while valuation is the main risk.",
        characterLimit:
            200
    });

assert.strictEqual(
    broadSectorAnswer.needsRepair,
    true,
    "Technology alone must not pass as a precise sector answer"
);

assert.ok(
    broadSectorAnswer.reasons.includes(
        "broad_sector_only"
    ),
    "Broad-sector-only output must be observable"
);


const oneSpecificSectorAnswer =
    answerQuality.evaluate({
        latestMessage:
            "sector to buy for long term",
        replyText:
            "Prioritize semiconductors; AI demand supports earnings, while valuation is the main risk.",
        characterLimit:
            200
    });

assert.ok(
    oneSpecificSectorAnswer.reasons.includes(
        "insufficient_specific_sectors"
    ),
    "A sector-selection answer must name at least two concrete sectors or subsectors"
);


const goodEnglishAnswer =
    "For long-term research, favor semiconductors and cybersecurity; durable demand supports earnings, while valuation is the key risk.";

assert.ok(
    countCharacters(goodEnglishAnswer) <= 200,
    "English direct answer example must fit the limit"
);

assert.strictEqual(
    answerQuality.evaluate({
        latestMessage:
            "sector to buy for long term",
        replyText:
            goodEnglishAnswer,
        characterLimit:
            200
    }).passed,
    true,
    "A concrete English sector answer should pass"
);


const goodChineseAnswer =
    "长期研究可优先关注半导体和网络安全；需求增长是核心依据，估值过热是主要风险。";

assert.ok(
    countCharacters(goodChineseAnswer) <= 200,
    "Chinese direct answer example must fit the limit"
);

assert.strictEqual(
    answerQuality.evaluate({
        latestMessage:
            "长期投资应该关注什么板块？",
        replyText:
            goodChineseAnswer,
        characterLimit:
            200
    }).passed,
    true,
    "A concrete Chinese sector answer should pass"
);


const duplicateHorizonAnswer =
    "Favor semiconductors and cybersecurity for long-term research. Is your horizon 5–10 years?";

const duplicateHorizonQuality =
    answerQuality.evaluate({
        latestMessage:
            "sector to buy for long term",
        replyText:
            duplicateHorizonAnswer,
        characterLimit:
            200
    });

assert.ok(
    duplicateHorizonQuality.reasons.includes(
        "duplicate_known_horizon_question"
    ),
    "The model must not ask again for a horizon already supplied by the customer"
);

assert.strictEqual(
    answerQuality.removeRedundantKnownContextQuestions({
        latestMessage:
            "sector to buy for long term",
        replyText:
            duplicateHorizonAnswer
    }),
    "Favor semiconductors and cybersecurity for long-term research.",
    "Runtime cleanup must remove the repeated horizon question"
);


const comparisonAnswer =
    answerQuality.evaluate({
        latestMessage:
            "Which is better, NVDA or AMD?",
        replyText:
            "NVDA has stronger AI exposure, while AMD offers a different valuation profile; favor NVDA for growth, with valuation as the main risk.",
        characterLimit:
            200
    });

assert.strictEqual(
    comparisonAnswer.passed,
    true,
    "A direct comparison should pass"
);


const guaranteedAnswer =
    answerQuality.evaluate({
        latestMessage:
            "What should I buy today?",
        replyText:
            "Buy NVDA because it will definitely rise and cannot lose.",
        characterLimit:
            200
    });

assert.ok(
    guaranteedAnswer.reasons.includes(
        "prohibited_guarantee"
    ),
    "Guaranteed-return language must be rejected"
);


const promptSource = fs.readFileSync(
    path.join(
        projectRoot,
        "server/prompts/conversion-system-prompt.js"
    ),
    "utf8"
);

assert.ok(
    promptSource.includes(
        "Direct Answer Framework 1.2.1"
    ),
    "Prompt must identify framework version 1.2.1"
);

assert.ok(
    promptSource.includes(
        "at least two concrete sectors or subsectors"
    ),
    "Prompt must require specific sector detail"
);

assert.ok(
    promptSource.includes(
        "Do not ask again for a horizon"
    ),
    "Prompt must prohibit repeated horizon questions"
);


const openaiSource = fs.readFileSync(
    path.join(
        projectRoot,
        "server/services/openai-service.js"
    ),
    "utf8"
);

assert.ok(
    openaiSource.includes(
        "ensureDirectAnswerQuality"
    ),
    "OpenAI service must run the quality gate"
);

assert.ok(
    openaiSource.includes(
        "removeRedundantKnownContextQuestions"
    ),
    "OpenAI service must remove repeated known-context questions"
);

assert.ok(
    openaiSource.includes(
        "quality.requiresCurrentResearch"
    ),
    "A failed current selection answer must receive one research-backed repair"
);

assert.ok(
    openaiSource.includes(
        "mergeSources"
    ),
    "Sources from a research-backed repair must be preserved"
);

assert.ok(
    openaiSource.includes(
        "[AI Direct Answer Repair]"
    ),
    "Direct-answer repair must be observable in logs"
);


assert.ok(
    openaiSource.includes(
        "maxRetries: 0"
    ),
    "SDK-level hidden retries must be disabled so retry count remains bounded"
);

assert.ok(
    openaiSource.includes(
        "isOpenAIRequestTimeout"
    ),
    "OpenAI timeouts must be detected explicitly"
);

assert.ok(
    openaiSource.includes(
        "[AI Request Timeout Fallback]"
    ),
    "Timeout fallback must be observable in logs"
);

assert.ok(
    openaiSource.includes(
        "requestTimeoutFallback"
    ),
    "Timeout fallback metadata must be returned to the conversation service"
);

assert.ok(
    openaiSource.includes(
        "forceSearch\n                ? 2600"
    ),
    "Web-search structured requests must have enough output-token headroom"
);


console.log(
    "AI Direct Answer Framework 1.2.1 and timeout fallback tests passed."
);
