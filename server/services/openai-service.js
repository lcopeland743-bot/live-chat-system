/**
 * Meridian OpenAI Service
 *
 * Version:
 * v2.3.0
 *
 * Uses:
 * - OpenAI Responses API
 * - GPT-5.6
 * - Structured Outputs
 * - Hosted Web Search
 * - Clickable source metadata
 * - 100-character visible reply enforcement
 */

const OpenAIModule =
require("openai");


const OpenAI =
OpenAIModule.default
|| OpenAIModule;


const aiConfig =
require("../config/ai-config");


const conversionConfig =
require("../config/conversion-config");


const {
    conversionResponseSchema,
    compressionResponseSchema
}
=
require("../schemas/conversion-response-schema");


const {
    buildConversionPrompt
}
=
require("../prompts/conversion-system-prompt");


const {
    cleanReplyText,
    countCharacters,
    countQuestions,
    limitCharacters,
    safeInternalText
}
=
require("../utils/conversion-text");


let client = null;


function isConfigured() {
    return Boolean(
        process.env.OPENAI_API_KEY
        && aiConfig.model
    );
}


function createServiceError(
    code,
    message,
    cause = null
) {
    const error = new Error(message);
    error.code = code;
    error.cause = cause;
    return error;
}


function getClient() {
    if (!isConfigured()) {
        throw createServiceError(
            "OPENAI_NOT_CONFIGURED",
            "OpenAI API is not configured"
        );
    }

    if (!client) {
        client = new OpenAI({
            apiKey:
                process.env.OPENAI_API_KEY,
            timeout:
                aiConfig.requestTimeoutMs,
            maxRetries: 1
        });
    }

    return client;
}


function normalizeRole(sender) {
    return sender === "user"
        ? "user"
        : "assistant";
}


function normalizeInput(messages) {
    return (messages || [])
        .filter(message => {
            return (
                message
                && typeof message.content === "string"
                && message.content.trim()
            );
        })
        .map(message => ({
            role: normalizeRole(
                message.sender
            ),
            content:
                message.content.trim()
        }));
}


function getLatestUserText(messages) {
    for (
        let index = (messages || []).length - 1;
        index >= 0;
        index -= 1
    ) {
        const message = messages[index];

        if (
            message
            && message.sender === "user"
            && typeof message.content === "string"
        ) {
            return message.content.trim();
        }
    }

    return "";
}


const NAME_TO_SYMBOL = {
    apple: "AAPL",
    tesla: "TSLA",
    nvidia: "NVDA",
    microsoft: "MSFT",
    amazon: "AMZN",
    meta: "META",
    facebook: "META",
    google: "GOOGL",
    alphabet: "GOOGL",
    netflix: "NFLX",
    amd: "AMD",
    broadcom: "AVGO",
    bitcoin: "BTC",
    btc: "BTC",
    ethereum: "ETH",
    ether: "ETH",
    solana: "SOL",
    sol: "SOL",
    苹果: "AAPL",
    特斯拉: "TSLA",
    英伟达: "NVDA",
    微软: "MSFT",
    亚马逊: "AMZN",
    比特币: "BTC",
    以太坊: "ETH",
    索拉纳: "SOL"
};


const TICKER_STOP_WORDS = new Set([
    "I",
    "A",
    "AN",
    "THE",
    "AI",
    "US",
    "USA",
    "CEO",
    "FED",
    "ETF",
    "GDP",
    "CPI",
    "PCE",
    "PMI",
    "USD",
    "WA",
    "OK"
]);


function extractSymbols(text) {
    const symbols = [];
    const lower = String(text || "").toLowerCase();

    Object.entries(NAME_TO_SYMBOL)
        .forEach(([name, symbol]) => {
            const normalizedName =
                name.toLowerCase();

            const matched =
                /[\u3400-\u9fff]/u.test(normalizedName)
                ? lower.includes(normalizedName)
                : new RegExp(
                    `\\b${normalizedName.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        "\\$&"
                    )}\\b`,
                    "i"
                ).test(text);

            if (matched) {
                symbols.push(symbol);
            }
        });

    const matches =
        String(text || "")
        .match(/\$?[A-Z]{1,5}\b/g)
        || [];

    matches.forEach(match => {
        const symbol =
            match.replace("$", "");

        if (!TICKER_STOP_WORDS.has(symbol)) {
            symbols.push(symbol);
        }
    });

    return [
        ...new Set(symbols)
    ].slice(0, 5);
}


function inferDataRequest(messages) {
    const text =
        getLatestUserText(messages);

    const symbols =
        extractSymbols(text);

    const currentPattern =
        /\b(today|tonight|now|current|currently|latest|live|real[\s-]?time|price|quote|performance|premarket|pre-market|after[\s-]?hours|this session|open today|close today)\b|今天|今日|现在|当前|最新|实时|行情|股价|价格|涨跌|盘前|盘后|开盘|收盘/iu;

    const newsPattern =
        /\b(news|headline|catalyst|announcement|development|why.*(?:up|down|move))\b|新闻|消息|公告|催化剂|为什么.*(?:涨|跌)/iu;

    const earningsPattern =
        /\b(earnings|revenue|guidance|quarter|results)\b|财报|营收|指引|季度业绩/iu;

    const macroPattern =
        /\b(fed|inflation|cpi|pce|rates?|yield|jobs report|payrolls?|gdp)\b|美联储|通胀|利率|收益率|非农|就业|国内生产总值/iu;

    const marketPattern =
        /\b(market|s&p|nasdaq|dow|stocks?|shares?|index|sector)\b|市场|美股|大盘|指数|板块|股票/iu;

    const shortAssetQuery = (
        symbols.length > 0
        && text.length <= 45
    );

    let type = "none";

    if (earningsPattern.test(text)) {
        type = "earnings";
    } else if (macroPattern.test(text)) {
        type = "macro_event";
    } else if (
        newsPattern.test(text)
        && symbols.length > 0
    ) {
        type = "company_news";
    } else if (newsPattern.test(text)) {
        type = "market_news";
    } else if (
        currentPattern.test(text)
        && symbols.length > 0
    ) {
        type = "quote";
    } else if (
        currentPattern.test(text)
        && marketPattern.test(text)
    ) {
        type = "market_status";
    } else if (shortAssetQuery) {
        type = "quote";
    }

    return {
        type,
        symbols,
        freshness:
            type === "quote"
            || type === "market_status"
            || type === "intraday"
            ? "real_time"
            : type === "none"
            ? "stable"
            : "current",
        required: type !== "none"
    };
}


function getFriendlyError(error) {
    const status =
        error && error.status
        ? error.status
        : null;

    const apiCode =
        error && error.code
        ? error.code
        : "";

    if (apiCode === "OPENAI_NOT_CONFIGURED") {
        return "OpenAI API is not configured.";
    }

    if (status === 401) {
        return "OpenAI rejected the API key.";
    }

    if (status === 429) {
        return "OpenAI API billing, quota, or rate limit prevented this request.";
    }

    if (status === 400) {
        return "OpenAI rejected the structured output or web search configuration.";
    }

    if (
        apiCode === "ETIMEDOUT"
        || apiCode === "ECONNRESET"
        || apiCode === "APIConnectionTimeoutError"
    ) {
        return "OpenAI web search timed out or the network connection failed.";
    }

    return "OpenAI could not generate a response.";
}


function isSafeHttpUrl(value) {
    try {
        const url = new URL(value);

        return (
            url.protocol === "http:"
            || url.protocol === "https:"
        );
    } catch (error) {
        return false;
    }
}


function normalizeSource(source) {
    if (!source) {
        return null;
    }

    const nested =
        source.url_citation
        || source.source
        || source;

    const url =
        nested.url
        || source.url
        || "";

    if (
        !url
        || !isSafeHttpUrl(url)
    ) {
        return null;
    }

    return {
        url,
        title:
            nested.title
            || source.title
            || new URL(url).hostname
    };
}


function extractSources(response) {
    const collected = [];

    const addSource = source => {
        const normalized =
            normalizeSource(source);

        if (!normalized) {
            return;
        }

        if (
            collected.some(
                item => item.url === normalized.url
            )
        ) {
            return;
        }

        collected.push(normalized);
    };

    const output =
        Array.isArray(response.output)
        ? response.output
        : [];

    // First collect URL citations that the model actually used in its answer.
    // Then fill any remaining slots from the complete web-search source list.
    output.forEach(item => {
        if (
            item
            && item.type === "message"
            && Array.isArray(item.content)
        ) {
            item.content.forEach(part => {
                const annotations =
                    Array.isArray(part.annotations)
                    ? part.annotations
                    : [];

                annotations.forEach(annotation => {
                    if (
                        annotation.type === "url_citation"
                        || annotation.url_citation
                    ) {
                        addSource(annotation);
                    }
                });
            });
        }
    });

    output.forEach(item => {
        if (
            item
            && item.type === "web_search_call"
            && item.action
            && Array.isArray(item.action.sources)
        ) {
            item.action.sources.forEach(
                addSource
            );
        }
    });

    return collected.slice(
        0,
        aiConfig.webSearch.maxSources
    );
}


function usedWebSearch(response) {
    return (
        Array.isArray(response.output)
        && response.output.some(item => {
            return (
                item
                && item.type === "web_search_call"
            );
        })
    );
}


function cleanJsonOutput(value) {
    return String(value || "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .replace(/cite[^]*/g, "")
        .trim();
}


function parseStructuredOutput(response) {
    const raw =
        String(response.output_text || "")
        .trim();

    if (!raw) {
        throw createServiceError(
            "OPENAI_EMPTY_RESPONSE",
            "OpenAI returned no structured output"
        );
    }

    try {
        return JSON.parse(raw);
    } catch (firstError) {
        try {
            return JSON.parse(
                cleanJsonOutput(raw)
            );
        } catch (secondError) {
            throw createServiceError(
                "OPENAI_INVALID_STRUCTURED_OUTPUT",
                "OpenAI returned invalid structured output",
                secondError
            );
        }
    }
}


function normalizeGenerated(value) {
    const source =
        value && typeof value === "object"
        ? value
        : {};

    const allowed = {
        investmentHorizon: [
            "unknown",
            "short_term",
            "medium_term",
            "long_term"
        ],

        positionStatus: [
            "unknown",
            "not_entered",
            "planning",
            "holding",
            "exited"
        ],

        entryPlan: [
            "unknown",
            "market_now",
            "wait_pullback",
            "staged_entry",
            "watchlist",
            "not_applicable"
        ],

        engagementSignal: [
            "neutral",
            "interested",
            "engaged",
            "hesitant",
            "closing",
            "negative"
        ],

        exitRisk: [
            "low",
            "medium",
            "high"
        ],

        reservedValueType: [
            "none",
            "entry_timing",
            "position_sizing",
            "risk_control",
            "valuation",
            "invalidation",
            "market_confirmation",
            "portfolio_fit",
            "catalyst"
        ],

        ctaRecommendation: [
            "hide",
            "show",
            "urgent_show",
            "suppress"
        ]
    };

    const enumValue = (
        key,
        fallback
    ) => {
        return allowed[key].includes(source[key])
            ? source[key]
            : fallback;
    };

    const dataRequest =
        source.dataRequest
        && typeof source.dataRequest === "object"
        ? source.dataRequest
        : {};

    return {
        replyText:
            cleanReplyText(source.replyText),

        intent:
            String(source.intent || "unknown")
            .slice(0, 80),

        asset:
            source.asset
            ? String(source.asset).slice(0, 24)
            : null,

        investmentHorizon:
            enumValue(
                "investmentHorizon",
                "unknown"
            ),

        positionStatus:
            enumValue(
                "positionStatus",
                "unknown"
            ),

        entryPlan:
            enumValue(
                "entryPlan",
                "unknown"
            ),

        engagementSignal:
            enumValue(
                "engagementSignal",
                "neutral"
            ),

        exitRisk:
            enumValue(
                "exitRisk",
                "low"
            ),

        valueDelivered:
            safeInternalText(
                source.valueDelivered,
                220
            ),

        reservedValue:
            source.reservedValue
            ? safeInternalText(
                source.reservedValue,
                220
            )
            : null,

        reservedValueType:
            enumValue(
                "reservedValueType",
                "none"
            ),

        question:
            source.question
            ? cleanReplyText(
                source.question
            ).slice(0, 100)
            : null,

        ctaRecommendation:
            enumValue(
                "ctaRecommendation",
                "hide"
            ),

        ctaTitle:
            cleanReplyText(
                source.ctaTitle
            ).slice(0, 45),

        ctaButtonText:
            cleanReplyText(
                source.ctaButtonText
            ).slice(0, 24),

        whatsappPrefill:
            String(
                source.whatsappPrefill
                || ""
            )
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 500),

        needsWebSearch:
            source.needsWebSearch === true,

        needsHuman:
            source.needsHuman === true,

        dataRequest: {
            type:
                String(
                    dataRequest.type
                    || "none"
                ),

            symbols:
                Array.isArray(
                    dataRequest.symbols
                )
                ? dataRequest.symbols
                    .map(item => {
                        return String(item)
                            .slice(0, 12);
                    })
                    .slice(0, 5)
                : [],

            freshness:
                String(
                    dataRequest.freshness
                    || "stable"
                ),

            required:
                dataRequest.required === true
        }
    };
}


async function compressReply({
    replyText,
    latestMessage
}) {
    const request = {
        model: aiConfig.model,

        reasoning: {
            effort: aiConfig.reasoningEffort
        },

        instructions:
            `Compress the reply into the customer's language. `
            + `Keep the useful conclusion and one real decision variable. `
            + `Maximum ${conversionConfig.replyCharacterLimit} Unicode characters. `
            + `Maximum one question. No URLs, citations, or WhatsApp wording. `
            + `Return only the required JSON.`,

        input: [
            {
                role: "user",
                content:
                    `Customer: ${latestMessage}\n`
                    + `Reply to compress: ${replyText}`
            }
        ],

        max_output_tokens: 250,

        text: {
            format: {
                type: "json_schema",
                name:
                    "meridian_reply_compression",
                strict: true,
                schema:
                    compressionResponseSchema
            }
        }
    };

    const response =
        await getClient()
        .responses
        .create(request);

    const parsed =
        parseStructuredOutput(response);

    return cleanReplyText(
        parsed.replyText
    );
}


async function ensureReplyCompliance({
    generated,
    latestMessage
}) {
    let text =
        cleanReplyText(
            generated.replyText
        );

    const compliant = (
        text
        && countCharacters(text)
            <= conversionConfig.replyCharacterLimit
        && countQuestions(text)
            <= conversionConfig.maxQuestionsPerReply
    );

    if (compliant) {
        generated.replyText = text;
        return generated;
    }

    try {
        text = await compressReply({
            replyText: text,
            latestMessage
        });
    } catch (error) {
        console.warn(
            "[AI Reply Compression Failed]",
            error.message
        );
    }

    generated.replyText =
        limitCharacters(
            text,
            conversionConfig.replyCharacterLimit
        );

    if (
        countQuestions(generated.replyText)
        > conversionConfig.maxQuestionsPerReply
    ) {
        const indexes = [
            generated.replyText.indexOf("?"),
            generated.replyText.indexOf("？")
        ].filter(index => index >= 0);

        if (indexes.length > 0) {
            const firstQuestion =
                Math.min(...indexes);

            generated.replyText =
                generated.replyText.slice(
                    0,
                    firstQuestion + 1
                );
        }
    }

    return generated;
}


function buildRequest({
    input,
    instructions,
    forceSearch
}) {
    const request = {
        model: aiConfig.model,

        reasoning: {
            effort:
                aiConfig.reasoningEffort
        },

        instructions,

        input,

        max_output_tokens:
            aiConfig.maxOutputTokens,

        text: {
            format: {
                type: "json_schema",
                name:
                    "meridian_conversion_reply",
                strict: true,
                schema:
                    conversionResponseSchema
            }
        }
    };

    if (
        forceSearch
        && aiConfig.webSearch.enabled
    ) {
        request.tools = [
            {
                type: "web_search",
                external_web_access: true,
                search_context_size:
                    aiConfig.webSearch.contextSize
            }
        ];

        request.tool_choice = "required";

        request.include = [
            "web_search_call.action.sources"
        ];
    }

    return request;
}


async function runConversionRequest({
    messages,
    state,
    currentTurn,
    hardSignals,
    forceSearch,
    serverDataRequest
}) {
    const input =
        normalizeInput(messages);

    const instructions =
        buildConversionPrompt({
            state,
            currentTurn,
            hardSignals,
            freshDataRequired:
                forceSearch,
            serverDataRequest
        });

    const request =
        buildRequest({
            input,
            instructions,
            forceSearch
        });

    const response =
        await getClient()
        .responses
        .create(request);

    return {
        response,
        generated:
            normalizeGenerated(
                parseStructuredOutput(
                    response
                )
            )
    };
}


async function generateConversionReply({
    messages,
    state,
    currentTurn,
    hardSignals
}) {
    const input =
        normalizeInput(messages);

    if (input.length === 0) {
        throw createServiceError(
            "AI_HISTORY_EMPTY",
            "No usable conversation messages were found"
        );
    }

    const latestMessage =
        getLatestUserText(messages);

    const serverDataRequest =
        inferDataRequest(messages);

    let result;

    try {
        result =
            await runConversionRequest({
                messages,
                state,
                currentTurn,
                hardSignals,
                forceSearch:
                    serverDataRequest.required,
                serverDataRequest
            });

        if (
            !serverDataRequest.required
            && result.generated.needsWebSearch
            && aiConfig.webSearch.enabled
        ) {
            result =
                await runConversionRequest({
                    messages,
                    state,
                    currentTurn,
                    hardSignals,
                    forceSearch: true,
                    serverDataRequest: {
                        ...serverDataRequest,
                        required: true,
                        freshness: "current"
                    }
                });
        }

        const webSearchUsed =
            usedWebSearch(
                result.response
            );

        if (
            serverDataRequest.required
            && !webSearchUsed
        ) {
            result.generated.replyText =
                /[\u3400-\u9fff]/u.test(latestMessage)
                ? "暂时无法核实最新市场数据，请稍后重试。关键风险变量仍需实时确认。"
                : "I could not verify current market data. Please retry; the key risk still needs live confirmation.";

            result.generated.ctaRecommendation =
                "hide";

            result.generated.needsHuman =
                true;
        }

        await ensureReplyCompliance({
            generated:
                result.generated,
            latestMessage
        });

        const sources =
            extractSources(
                result.response
            );

        return {
            ...result.generated,

            text:
                result.generated.replyText,

            characterCount:
                countCharacters(
                    result.generated.replyText
                ),

            responseId:
                result.response.id
                || null,

            model:
                result.response.model
                || aiConfig.model,

            usage:
                result.response.usage
                || null,

            webSearchUsed,

            freshDataRequired:
                serverDataRequest.required,

            searchedAt:
                webSearchUsed
                ? new Date().toISOString()
                : null,

            sources,

            serverDataRequest:
                serverDataRequest.required
                ? serverDataRequest
                : result.generated.dataRequest
        };
    } catch (error) {
        if (
            error
            && (
                error.code === "OPENAI_EMPTY_RESPONSE"
                || error.code === "OPENAI_INVALID_STRUCTURED_OUTPUT"
                || error.code === "AI_HISTORY_EMPTY"
            )
        ) {
            throw error;
        }

        const wrapped =
            createServiceError(
                "OPENAI_REQUEST_FAILED",
                getFriendlyError(error),
                error
            );

        wrapped.status =
            error && error.status
            ? error.status
            : null;

        throw wrapped;
    }
}


/**
 * Compatibility wrapper for older internal callers.
 */
async function generateReply({
    messages
}) {
    return await generateConversionReply({
        messages,
        state: {},
        currentTurn: 1,
        hardSignals: {}
    });
}


module.exports = {
    isConfigured,
    generateReply,
    generateConversionReply,
    inferDataRequest,
    getFriendlyError
};
