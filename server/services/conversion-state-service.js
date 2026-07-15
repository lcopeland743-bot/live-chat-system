/**
 * Meridian Conversion State Service
 *
 * Version:
 * v2.3.0
 */

const conversionConfig =
require("../config/conversion-config");


const STAGES = [
    "new",
    "discovery",
    "value_proved",
    "cta_ready",
    "cta_sent",
    "closed"
];


const HORIZONS = [
    "unknown",
    "short_term",
    "medium_term",
    "long_term"
];


const POSITION_STATUSES = [
    "unknown",
    "not_entered",
    "planning",
    "holding",
    "exited"
];


const ENTRY_PLANS = [
    "unknown",
    "market_now",
    "wait_pullback",
    "staged_entry",
    "watchlist",
    "not_applicable"
];


const ENGAGEMENT_SIGNALS = [
    "neutral",
    "interested",
    "engaged",
    "hesitant",
    "closing",
    "negative"
];


const EXIT_RISKS = [
    "low",
    "medium",
    "high"
];


const RESERVED_VALUE_TYPES = [
    "none",
    "entry_timing",
    "position_sizing",
    "risk_control",
    "valuation",
    "invalidation",
    "market_confirmation",
    "portfolio_fit",
    "catalyst"
];


function enumValue(value, allowed, fallback) {
    return allowed.includes(value)
        ? value
        : fallback;
}


function nullableString(value, maximum = 240) {
    if (
        value === null
        || value === undefined
        || value === ""
    ) {
        return null;
    }

    return String(value)
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maximum)
        || null;
}


function nonNegativeInteger(value, fallback = 0) {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed >= 0
        ? parsed
        : fallback;
}


function createDefaultState() {
    return {
        stage: "new",

        eligibleTurnCount: 0,
        intent: "unknown",
        asset: null,
        investmentHorizon: "unknown",
        positionStatus: "unknown",
        entryPlan: "unknown",

        valueDelivered: [],
        conversionSeedDelivered: false,
        reservedValue: null,
        reservedValueType: "none",

        engagementScore: 0,
        engagementSignal: "neutral",
        exitRisk: "low",

        ctaShownCount: 0,
        lastCtaTurn: null,
        lastCtaTrackingId: null,

        whatsappClicked: false,
        doNotPush: false,
        humanTakeover: false,

        lastQuestionAsked: null,
        policyVersion: conversionConfig.policyVersion,
        promptVersion: conversionConfig.promptVersion,
        updatedAt: null
    };
}


function normalize(state) {
    const source =
        state && typeof state.toObject === "function"
        ? state.toObject()
        : state || {};

    const defaults = createDefaultState();

    return {
        stage: enumValue(
            source.stage,
            STAGES,
            defaults.stage
        ),

        eligibleTurnCount: nonNegativeInteger(
            source.eligibleTurnCount,
            defaults.eligibleTurnCount
        ),

        intent:
            nullableString(source.intent, 80)
            || defaults.intent,

        asset: nullableString(source.asset, 24),

        investmentHorizon: enumValue(
            source.investmentHorizon,
            HORIZONS,
            defaults.investmentHorizon
        ),

        positionStatus: enumValue(
            source.positionStatus,
            POSITION_STATUSES,
            defaults.positionStatus
        ),

        entryPlan: enumValue(
            source.entryPlan,
            ENTRY_PLANS,
            defaults.entryPlan
        ),

        valueDelivered: Array.isArray(source.valueDelivered)
            ? source.valueDelivered
                .map(value => nullableString(value, 220))
                .filter(Boolean)
                .slice(-10)
            : [],

        conversionSeedDelivered:
            source.conversionSeedDelivered === true,

        reservedValue:
            nullableString(source.reservedValue, 220),

        reservedValueType: enumValue(
            source.reservedValueType,
            RESERVED_VALUE_TYPES,
            defaults.reservedValueType
        ),

        engagementScore: Math.max(
            0,
            Math.min(
                100,
                Number(source.engagementScore) || 0
            )
        ),

        engagementSignal: enumValue(
            source.engagementSignal,
            ENGAGEMENT_SIGNALS,
            defaults.engagementSignal
        ),

        exitRisk: enumValue(
            source.exitRisk,
            EXIT_RISKS,
            defaults.exitRisk
        ),

        ctaShownCount: nonNegativeInteger(
            source.ctaShownCount,
            defaults.ctaShownCount
        ),

        lastCtaTurn:
            source.lastCtaTurn === null
            || source.lastCtaTurn === undefined
            ? null
            : nonNegativeInteger(source.lastCtaTurn, null),

        lastCtaTrackingId:
            nullableString(source.lastCtaTrackingId, 100),

        whatsappClicked:
            source.whatsappClicked === true,

        doNotPush:
            source.doNotPush === true,

        humanTakeover:
            source.humanTakeover === true,

        lastQuestionAsked:
            nullableString(source.lastQuestionAsked, 100),

        policyVersion:
            nullableString(source.policyVersion, 20)
            || conversionConfig.policyVersion,

        promptVersion:
            nullableString(source.promptVersion, 20)
            || conversionConfig.promptVersion,

        updatedAt:
            source.updatedAt
            ? new Date(source.updatedAt)
            : null
    };
}


function engagementDelta(signal) {
    const values = {
        engaged: 8,
        interested: 5,
        hesitant: 1,
        neutral: 0,
        closing: -2,
        negative: -8
    };

    return values[signal] || 0;
}


function advance({
    state,
    generated,
    decision
}) {
    const current = normalize(state);
    const turn = current.eligibleTurnCount + 1;

    const valueDelivered = [
        ...current.valueDelivered
    ];

    if (
        generated.valueDelivered
        && !valueDelivered.includes(
            generated.valueDelivered
        )
    ) {
        valueDelivered.push(
            generated.valueDelivered
        );
    }

    while (valueDelivered.length > 10) {
        valueDelivered.shift();
    }

    let stage = current.stage;

    if (decision.showWhatsapp) {
        stage = "cta_sent";
    } else if (turn === 1) {
        stage = "discovery";
    } else if (
        generated.valueDelivered
        || current.conversionSeedDelivered
    ) {
        stage = "value_proved";
    }

    if (decision.closeConversation) {
        stage = "closed";
    }

    return {
        ...current,

        stage,
        eligibleTurnCount: turn,

        intent:
            generated.intent
            || current.intent,

        asset:
            generated.asset
            || current.asset,

        investmentHorizon:
            generated.investmentHorizon !== "unknown"
            ? generated.investmentHorizon
            : current.investmentHorizon,

        positionStatus:
            generated.positionStatus !== "unknown"
            ? generated.positionStatus
            : current.positionStatus,

        entryPlan:
            generated.entryPlan !== "unknown"
            ? generated.entryPlan
            : current.entryPlan,

        valueDelivered,

        conversionSeedDelivered:
            current.conversionSeedDelivered
            || Boolean(generated.valueDelivered),

        reservedValue:
            generated.reservedValue
            || current.reservedValue,

        reservedValueType:
            generated.reservedValueType !== "none"
            ? generated.reservedValueType
            : current.reservedValueType,

        engagementScore: Math.max(
            0,
            Math.min(
                100,
                current.engagementScore
                + engagementDelta(
                    generated.engagementSignal
                )
            )
        ),

        engagementSignal:
            generated.engagementSignal
            || current.engagementSignal,

        exitRisk:
            decision.exitRisk
            || generated.exitRisk
            || current.exitRisk,

        ctaShownCount:
            current.ctaShownCount
            + (
                decision.showWhatsapp
                ? 1
                : 0
            ),

        lastCtaTurn:
            decision.showWhatsapp
            ? turn
            : current.lastCtaTurn,

        lastCtaTrackingId:
            decision.trackingId
            || current.lastCtaTrackingId,

        whatsappClicked:
            current.whatsappClicked,

        doNotPush:
            current.doNotPush
            || decision.doNotPush === true,

        humanTakeover:
            current.humanTakeover,

        lastQuestionAsked:
            generated.question
            || null,

        policyVersion:
            conversionConfig.policyVersion,

        promptVersion:
            conversionConfig.promptVersion,

        updatedAt: new Date()
    };
}


module.exports = {
    STAGES,
    createDefaultState,
    normalize,
    advance
};
