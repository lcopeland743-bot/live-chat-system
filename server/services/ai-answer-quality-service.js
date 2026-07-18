/**
 * Meridian AI Answer Quality Service
 *
 * Version:
 * v2.3.7
 *
 * Framework:
 * Direct Answer Framework 1.2.1
 *
 * Purpose:
 * - Detect customer questions that require a direct answer
 * - Require concrete sector/subsector answers for sector-selection questions
 * - Remove repeated questions about context the customer already supplied
 * - Reject vague, non-responsive drafts before they are saved
 * - Keep quality rules independent from WhatsApp conversion policy
 */

const {
    cleanReplyText,
    countCharacters
}
=
require("../utils/conversion-text");


const DIRECT_PATTERNS = {
    sectorSelection:
        /(?:\b(?:which|what|best|top|prefer|favor|choose|buy|watch|focus|sector|industry)\b.{0,45}\b(?:sector|industry)\b|\b(?:sector|industry)\b.{0,45}\b(?:buy|watch|choose|best|better|long[\s-]?term|short[\s-]?term)\b)|(?:哪个|什么|哪些|推荐|看好|关注|买|布局).{0,20}(?:板块|行业)|(?:板块|行业).{0,20}(?:哪个好|更好|值得|推荐|关注|布局)/iu,

    assetComparison:
        /\b(?:compare|comparison|versus|vs\.?|better than|which is better|prefer)\b|(?:\b(?:stock|stocks|sector|industry|etf|energy|tech|technology|ai)\b.{0,30}\bor\b.{0,30}\b(?:stock|stocks|sector|industry|etf|energy|tech|technology|ai)\b)|(?:比较|对比|相比|哪个更好|哪一个更好|更值得|二选一)|(?:(?:股票|板块|行业|ETF).{0,20}(?:还是|或).{0,20}(?:股票|板块|行业|ETF))/iu,

    assetSelection:
        /(?:\b(?:which|what|best|top|prefer|choose|buy|watch|focus)\b.{0,45}\b(?:stock|stocks|share|shares|etf|asset|company|name)\b|\b(?:stock|stocks|share|shares|etf|asset|company|name)\b.{0,45}\b(?:buy|watch|choose|best|better)\b)|\b(?:what should i buy|what to buy|what should i watch|what to watch)\b|(?:买|关注|选择|推荐|看好).{0,20}(?:股票|个股|ETF|标的)|(?:哪只|哪个).{0,12}(?:股票|个股|ETF|标的)|(?:我该买什么|应该买什么|买什么好|该关注什么)/iu,

    explanation:
        /^\s*(?:why|how come|what caused|what is causing)\b|(?:为什么|什么原因|原因是什么|为何)/iu
};


const SPECIFIC_SECTOR_PATTERNS = [
    {
        key: "semiconductors",
        pattern: /\b(?:semiconductors?|chips?|chipmakers?)\b|半导体|芯片/iu
    },
    {
        key: "cybersecurity",
        pattern: /\bcyber[\s-]?security\b|网络安全/iu
    },
    {
        key: "cloud_infrastructure",
        pattern: /\b(?:cloud infrastructure|cloud computing|hyperscale cloud)\b|云基础设施|云计算/iu
    },
    {
        key: "data_centers",
        pattern: /\b(?:data centers?|datacenters?)\b|数据中心/iu
    },
    {
        key: "power_grid",
        pattern: /\b(?:power grid|grid infrastructure|electrical grid|power infrastructure)\b|电网|电力基础设施/iu
    },
    {
        key: "utilities",
        pattern: /\butilities\b|公用事业/iu
    },
    {
        key: "defense",
        pattern: /\bdefen[cs]e\b|国防|军工/iu
    },
    {
        key: "aerospace",
        pattern: /\baerospace\b|航空航天/iu
    },
    {
        key: "biotech",
        pattern: /\b(?:biotech|biotechnology)\b|生物科技/iu
    },
    {
        key: "medical_devices",
        pattern: /\bmedical devices?\b|医疗器械/iu
    },
    {
        key: "banks",
        pattern: /\bbanks?\b|银行/iu
    },
    {
        key: "insurance",
        pattern: /\binsurance\b|保险/iu
    },
    {
        key: "payments",
        pattern: /\bpayments?\b|支付/iu
    },
    {
        key: "industrial_automation",
        pattern: /\bindustrial automation\b|工业自动化/iu
    },
    {
        key: "robotics",
        pattern: /\brobotics\b|机器人/iu
    },
    {
        key: "renewable_energy",
        pattern: /\b(?:renewable energy|solar|wind power|clean energy)\b|可再生能源|清洁能源|太阳能|风电/iu
    },
    {
        key: "oil_gas",
        pattern: /\b(?:oil and gas|oil & gas|energy producers?)\b|石油天然气|油气/iu
    },
    {
        key: "consumer_staples",
        pattern: /\bconsumer staples\b|必需消费/iu
    },
    {
        key: "software",
        pattern: /\bsoftware\b|软件/iu
    }
];


const BROAD_SECTOR_PATTERN =
    /\b(?:technology|tech|ai|energy|healthcare|financials?|industrials?|consumer|communications?|real estate|materials?|infrastructure|growth sectors?)\b|(?:科技|人工智能|AI|能源|医疗|金融|工业|消费|通信|房地产|材料|基础设施|成长板块)/iu;


const VAGUE_PATTERNS = [
    /\b(?:watch|wait for|look for)\s+(?:confirmation|the signal|timing|risk)\b/iu,
    /\bconfirmation\s+(?:matters|is key|is important)\b/iu,
    /\b(?:timing|risk)\s+(?:matters|is key|is important)\b/iu,
    /\bit depends\b/iu,
    /\bdo your own research\b/iu,
    /\bconsider the risks?\b/iu,
    /等待(?:确认|信号|时机)/u,
    /关键是(?:确认|时机|风险)/u,
    /注意风险/u,
    /视情况而定/u,
    /需要进一步观察/u
];


const CAUSAL_PATTERN =
    /\b(?:because|due to|driven by|supported by|as|since|reflects|from)\b|(?:因为|由于|受益于|核心原因|原因是|主要看|来自)/iu;


const COMPARISON_PATTERN =
    /\b(?:prefer|favor|better|stronger|weaker|higher|lower|more|less|versus|vs\.?|while|whereas)\b|(?:更好|更强|更弱|优先|偏向|相比|而|优势|劣势)/iu;


const GUARANTEE_PATTERN =
    /\b(?:guaranteed|guarantee|risk[\s-]?free|sure profit|certain profit|will definitely|cannot lose)\b|(?:保证收益|稳赚|必赚|一定上涨|绝对上涨|零风险|不会亏)/iu;


const EXPLICIT_LIMITATION_PATTERN =
    /\b(?:cannot|can't|could not|unable|insufficient|not enough).{0,45}(?:verify|confirm|compare|identify)\b|(?:无法|不能|未能|不足).{0,35}(?:确认|核实|比较|识别)/iu;


const HORIZON_PATTERNS = {
    long_term:
        /\b(?:long[\s-]?term|multi[\s-]?year|5\s*(?:to|-|–)\s*10\s*years?|five\s*(?:to|-|–)\s*ten\s*years?|years? ahead)\b|长期|长线|五到十年|5到10年|多年/iu,

    short_term:
        /\b(?:short[\s-]?term|day trad(?:e|ing)|swing trad(?:e|ing)|days?|weeks?)\b|短期|短线|日内|几天|几周/iu,

    medium_term:
        /\b(?:medium[\s-]?term|mid[\s-]?term|months?|1\s*(?:to|-|–)\s*3\s*years?)\b|中期|几个月|一到三年|1到3年/iu
};


const HORIZON_QUESTION_PATTERN =
    /(?:\b(?:what|which|is|are|do|does|how)\b.{0,35}\b(?:horizon|timeframe|time frame|holding period|long[\s-]?term|short[\s-]?term|5\s*(?:to|-|–)\s*10\s*years?|years?)\b)|(?:投资期限|投资周期|持有多久|长期还是短期|长线还是短线|几年).{0,20}[?？]/iu;


function classifyRequest(message) {
    const text = String(message || "").trim();

    if (!text) {
        return {
            kind: "none",
            requiresDirectAnswer: false,
            requiresCurrentResearch: false
        };
    }

    if (DIRECT_PATTERNS.sectorSelection.test(text)) {
        return {
            kind: "sector_selection",
            requiresDirectAnswer: true,
            requiresCurrentResearch: true
        };
    }

    if (DIRECT_PATTERNS.assetComparison.test(text)) {
        return {
            kind: "asset_comparison",
            requiresDirectAnswer: true,
            requiresCurrentResearch: true
        };
    }

    if (DIRECT_PATTERNS.assetSelection.test(text)) {
        return {
            kind: "asset_selection",
            requiresDirectAnswer: true,
            requiresCurrentResearch: true
        };
    }

    if (DIRECT_PATTERNS.explanation.test(text)) {
        return {
            kind: "explanation",
            requiresDirectAnswer: true,
            requiresCurrentResearch: false
        };
    }

    return {
        kind: "none",
        requiresDirectAnswer: false,
        requiresCurrentResearch: false
    };
}


function getSpecificSectorMentions(replyText) {
    const text = String(replyText || "");

    return SPECIFIC_SECTOR_PATTERNS
        .filter(item => item.pattern.test(text))
        .map(item => item.key);
}


function containsSectorName(replyText) {
    return (
        getSpecificSectorMentions(replyText).length > 0
        || BROAD_SECTOR_PATTERN.test(
            String(replyText || "")
        )
    );
}


function containsConcreteSectorSet(replyText) {
    return getSpecificSectorMentions(replyText).length >= 2;
}


function containsConcreteAsset(replyText) {
    const text = String(replyText || "");

    return Boolean(
        /\$?[A-Z]{1,5}\b/u.test(text)
        || /\b(?:Apple|Microsoft|Nvidia|Tesla|Amazon|Meta|Alphabet|Google|AMD|Broadcom)\b/iu.test(text)
        || /(?:苹果|微软|英伟达|特斯拉|亚马逊|谷歌|超微|博通)/u.test(text)
        || getSpecificSectorMentions(text).length > 0
    );
}


function detectKnownHorizon(latestMessage) {
    const text = String(latestMessage || "");

    for (const [key, pattern] of Object.entries(HORIZON_PATTERNS)) {
        if (pattern.test(text)) {
            return key;
        }
    }

    return "unknown";
}


function splitSentences(value) {
    return (
        cleanReplyText(value)
        .match(/[^。！？.!?]+[。！？.!?]?/gu)
        || []
    );
}


function containsRedundantKnownContextQuestion({
    latestMessage,
    replyText
}) {
    if (detectKnownHorizon(latestMessage) === "unknown") {
        return false;
    }

    return splitSentences(replyText).some(sentence => {
        return (
            /[?？]/u.test(sentence)
            && HORIZON_QUESTION_PATTERN.test(sentence)
        );
    });
}


function removeRedundantKnownContextQuestions({
    latestMessage,
    replyText
}) {
    if (detectKnownHorizon(latestMessage) === "unknown") {
        return cleanReplyText(replyText);
    }

    const kept = splitSentences(replyText)
        .filter(sentence => {
            return !(
                /[?？]/u.test(sentence)
                && HORIZON_QUESTION_PATTERN.test(sentence)
            );
        })
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    return kept || cleanReplyText(replyText);
}


function isMostlyVague(replyText) {
    const text = cleanReplyText(replyText);

    if (!text) {
        return true;
    }

    const vagueMatches = VAGUE_PATTERNS.filter(pattern => {
        return pattern.test(text);
    }).length;

    return (
        vagueMatches >= 2
        || (
            vagueMatches >= 1
            && !containsConcreteAsset(text)
            && !CAUSAL_PATTERN.test(text)
        )
    );
}


function evaluate({
    latestMessage,
    replyText,
    characterLimit = 200
}) {
    const request = classifyRequest(latestMessage);
    const text = cleanReplyText(replyText);
    const reasons = [];

    if (!text) {
        reasons.push("empty_reply");
    }

    if (countCharacters(text) > characterLimit) {
        reasons.push("reply_too_long");
    }

    if (GUARANTEE_PATTERN.test(text)) {
        reasons.push("prohibited_guarantee");
    }

    if (
        containsRedundantKnownContextQuestion({
            latestMessage,
            replyText: text
        })
    ) {
        reasons.push("duplicate_known_horizon_question");
    }

    if (!request.requiresDirectAnswer) {
        return {
            ...request,
            passed: reasons.length === 0,
            reasons,
            needsRepair: reasons.length > 0
        };
    }

    if (isMostlyVague(text)) {
        reasons.push("vague_only");
    }

    if (
        request.kind === "sector_selection"
        && !EXPLICIT_LIMITATION_PATTERN.test(text)
    ) {
        const specificSectors =
            getSpecificSectorMentions(text);

        if (specificSectors.length === 0) {
            reasons.push("missing_specific_sector_answer");
        } else if (specificSectors.length < 2) {
            reasons.push("insufficient_specific_sectors");
        }

        if (
            BROAD_SECTOR_PATTERN.test(text)
            && specificSectors.length < 2
        ) {
            reasons.push("broad_sector_only");
        }
    }

    if (
        request.kind === "asset_selection"
        && !containsConcreteAsset(text)
        && !EXPLICIT_LIMITATION_PATTERN.test(text)
    ) {
        reasons.push("missing_asset_answer");
    }

    if (
        request.kind === "asset_comparison"
        && !COMPARISON_PATTERN.test(text)
        && !EXPLICIT_LIMITATION_PATTERN.test(text)
    ) {
        reasons.push("missing_comparison_answer");
    }

    if (
        request.kind === "explanation"
        && !CAUSAL_PATTERN.test(text)
    ) {
        reasons.push("missing_reason");
    }

    return {
        ...request,
        passed: reasons.length === 0,
        reasons: [...new Set(reasons)],
        needsRepair: reasons.length > 0
    };
}


function buildRepairInstruction({
    customerLanguage,
    quality,
    characterLimit
}) {
    const languageName = (
        customerLanguage
        && customerLanguage.name
        ? customerLanguage.name
        : "English"
    );

    const sectorRequirement = (
        quality.kind === "sector_selection"
        ? `Name at least two concrete sectors or subsectors. Broad labels such as technology, AI, energy, or healthcare alone are not specific enough. `
        : ""
    );

    const researchRule = (
        quality.requiresCurrentResearch
        ? `Use the web-search evidence available in this repair call for current claims. `
        : `Use only facts already present in the supplied draft and internal context. `
    );

    return (
        `Rewrite only replyText in ${languageName}. `
        + `The customer requires a direct ${quality.kind.replace(/_/g, " ")} answer. `
        + `Start with the specific conclusion or explicit data limitation, then give the main reason and one condition or risk. `
        + sectorRequirement
        + `Do not ask again for a horizon, timeframe, position, or preference that the latest customer message already states. `
        + `Do not change any CTA field or WhatsApp decision. `
        + researchRule
        + `If evidence is insufficient, clearly say that current leaders cannot be verified instead of inventing them. `
        + `Avoid generic phrases such as "wait for confirmation" unless they follow a concrete answer. `
        + `Never promise profit or certainty. Maximum ${characterLimit} Unicode characters. `
        + `Return only the required JSON object.`
    );
}


module.exports = {
    classifyRequest,
    evaluate,
    buildRepairInstruction,
    containsSectorName,
    containsConcreteSectorSet,
    getSpecificSectorMentions,
    detectKnownHorizon,
    containsRedundantKnownContextQuestion,
    removeRedundantKnownContextQuestions,
    isMostlyVague
};
