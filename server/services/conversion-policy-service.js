/**
 * Meridian Conversion Policy Service
 *
 * Version:
 * v2.3.4
 *
 * The model proposes. This service decides.
 */

const conversionConfig =
require("../config/conversion-config");


const conversationLanguageService =
require("./conversation-language-service");


const {
    containsCjk,
    cleanReplyText,
    stripWhatsappLanguage,
    countCharacters,
    countQuestions,
    limitCharacters,
    getGraphemes
}
=
require("../utils/conversion-text");


function normalizeMessage(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[.!?,，。！？；;:：'"“”‘’]+/g, "")
        .replace(/\s+/g, " ");
}


function detectHardSignals(message) {
    const original = String(message || "").trim();
    const normalized = normalizeMessage(original);

    const closingPhrases = new Set([
        "ok",
        "okay",
        "thanks",
        "thank you",
        "got it",
        "understood",
        "sounds good",
        "fine",
        "好的",
        "好",
        "谢谢",
        "感谢",
        "明白",
        "知道了",
        "了解",
        "可以"
    ]);

    const refusalPattern =
        /\b(?:do not|don't|dont|no|not interested in|stop)\b.{0,28}\b(?:whatsapp|wa)\b|\b(?:stay|continue)\b.{0,20}\bhere\b|不(?:想|要|需要).{0,12}(?:whatsapp|wa|私域)|别.{0,8}(?:发|推).{0,8}(?:whatsapp|wa|链接)|就在这里|继续在这里/iu;

    const explicitRequestPattern =
        /\b(?:send|give|share|show|open|where(?:'s| is)|how do i get)\b.{0,28}\b(?:whatsapp|wa|link|briefing|report|checklist)\b|(?:whatsapp|wa).{0,20}(?:link|number)|发给我|给我(?:链接|简报|报告)|怎么领取|如何领取|链接在哪|怎么进入|我要加入/iu;

    const holdingPattern =
        /\b(?:i own|i hold|holding|already bought|already in)\b|我(?:已经)?持有|我买了|已经买入/iu;

    const planningPattern =
        /\b(?:planning to buy|want to buy|waiting to enter|wait for a pullback|watching for entry)\b|准备买|计划买|等待入场|等回调|观望/iu;

    return {
        closing:
            closingPhrases.has(normalized)
            || (
                normalized.length <= 18
                && /^(?:ok+|okay|thanks?|thank you|got it|understood|sounds good)$/i
                    .test(normalized)
            ),

        refusal:
            refusalPattern.test(original),

        explicitWhatsappRequest:
            explicitRequestPattern.test(original),

        holding:
            holdingPattern.test(original),

        planning:
            planningPattern.test(original)
    };
}


function customerLanguage(
    latestMessage,
    generated = null
) {
    return (
        generated
        && generated.customerLanguage
        ? generated.customerLanguage
        : conversationLanguageService
            .detectLanguage(
                latestMessage
            )
    );
}


function createFallbackReply(
    message,
    generated = null
) {
    return conversationLanguageService
        .getLocalized(
            "fallback",
            customerLanguage(
                message,
                generated
            )
        );
}


function createRefusalReply(
    message,
    generated = null
) {
    return conversationLanguageService
        .getLocalized(
            "refusal",
            customerLanguage(
                message,
                generated
            )
        );
}


function forceFinalWhatsappClose({
    text,
    latestMessage,
    generated
}) {
    const language =
        customerLanguage(
            latestMessage,
            generated
        );

    const suffix =
        conversationLanguageService
        .getLocalized(
            "finalClose",
            language
        );

    let base =
        removeQuestions(
            stripWhatsappLanguage(
                text
            )
        )
        .trim();

    const suffixLength =
        countCharacters(
            suffix
        );

    const joiner =
        language.code === "zh"
        || language.code === "ja"
        || language.code === "ko"
        ? ""
        : " ";

    const available =
        conversionConfig
        .replyCharacterLimit
        - suffixLength
        - (
            base
            ? countCharacters(joiner)
            : 0
        );

    if (available <= 0) {
        return getGraphemes(
            suffix
        )
        .slice(
            0,
            conversionConfig
            .replyCharacterLimit
        )
        .join("");
    }

    if (
        countCharacters(base)
        > available
    ) {
        base =
            limitCharacters(
                base,
                available
            )
            .replace(/…$/u, "")
            .trim();
    }

    const combined =
        base
        ? `${base}${joiner}${suffix}`
        : suffix;

    return getGraphemes(
        combined
    )
    .slice(
        0,
        conversionConfig
        .replyCharacterLimit
    )
    .join("");
}


function removeQuestions(value) {
    const text = cleanReplyText(value);

    const sentences =
        text.match(/[^。！？.!?]+[。！？.!?]?/gu)
        || [];

    const kept = sentences
        .filter(sentence => !/[?？]/u.test(sentence))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

    if (kept) {
        return kept;
    }

    return text
        .replace(/[?？]+/gu, ".")
        .replace(/\s+/g, " ")
        .trim();
}


function normalizeReply({
    replyText,
    latestMessage,
    showWhatsapp,
    refusal,
    noQuestion,
    finalWhatsapp,
    generated
}) {
    if (refusal) {
        return createRefusalReply(
            latestMessage,
            generated
        );
    }

    let text = cleanReplyText(replyText);

    if (!showWhatsapp) {
        text = stripWhatsappLanguage(text);
    }

    if (!text) {
        text = createFallbackReply(
            latestMessage,
            generated
        );
    }

    if (noQuestion) {
        text = removeQuestions(text);
    }

    if (finalWhatsapp) {
        return forceFinalWhatsappClose({
            text,
            latestMessage,
            generated
        });
    }

    if (
        countCharacters(text)
        > conversionConfig.replyCharacterLimit
    ) {
        text = limitCharacters(
            text,
            conversionConfig.replyCharacterLimit
        );
    }

    if (
        countQuestions(text)
        > conversionConfig.maxQuestionsPerReply
    ) {
        const questionIndexes = [
            text.indexOf("?"),
            text.indexOf("？")
        ].filter(index => index >= 0);

        if (questionIndexes.length > 0) {
            const questionIndex = Math.min(
                ...questionIndexes
            );

            text = text.slice(
                0,
                questionIndex + 1
            );
        }
    }

    return text;
}


function hasUsefulContext(generated, hardSignals) {
    return Boolean(
        generated.asset
        || generated.investmentHorizon !== "unknown"
        || generated.positionStatus !== "unknown"
        || generated.entryPlan !== "unknown"
        || hardSignals.holding
        || hardSignals.planning
    );
}


function apply({
    generated,
    state,
    latestMessage
}) {
    const hardSignals =
        detectHardSignals(latestMessage);

    const turn =
        Number(state.eligibleTurnCount || 0) + 1;

    const aiReplyNumber =
        Number(state.aiReplyCount || 0) + 1;

    const finalAiReply =
        aiReplyNumber >=
        conversionConfig
        .maxAiRepliesPerSession;

    const finalCtaBlocked = Boolean(
        !conversionConfig.whatsapp.enabled
        || state.whatsappClicked
        || state.doNotPush
        || state.humanTakeover
        || hardSignals.refusal
    );

    const ctaBlocked = Boolean(
        finalCtaBlocked
        || state.ctaShownCount >=
            conversionConfig.maxCtaPerSession
    );

    const mandatoryFinalWhatsapp =
        finalAiReply
        && !finalCtaBlocked;

    const cooldownBlocked = Boolean(
        state.ctaShownCount > 0
        && state.lastCtaTurn !== null
        && (
            turn - state.lastCtaTurn
        ) < conversionConfig.ctaCooldownTurns
    );

    const modelWantsCta = (
        generated.ctaRecommendation === "show"
        || generated.ctaRecommendation === "urgent_show"
    );

    const exitRisk = (
        hardSignals.closing
        ? "high"
        : generated.exitRisk
    );

    let showWhatsapp = false;
    let needsHuman =
        generated.needsHuman === true;
    let decisionType = "continue";
    let suppressReason = null;

    if (hardSignals.refusal) {
        suppressReason = "customer_refused_whatsapp";
        decisionType = "suppress";
    } else if (state.whatsappClicked) {
        suppressReason = "whatsapp_already_clicked";
        decisionType = "suppress";
    } else if (state.doNotPush) {
        suppressReason = "do_not_push";
        decisionType = "suppress";
    } else if (state.humanTakeover) {
        suppressReason = "human_takeover";
        decisionType = "human";
        needsHuman = true;
    } else if (mandatoryFinalWhatsapp) {
        showWhatsapp = true;
        decisionType = "cta";
        suppressReason = null;
        needsHuman = false;
    } else if (!ctaBlocked && hardSignals.explicitWhatsappRequest) {
        showWhatsapp = true;
        decisionType = "cta";
    } else if (turn === 1) {
        showWhatsapp = false;
        decisionType = needsHuman
            ? "human"
            : "continue";
    } else if (
        !ctaBlocked
        && !cooldownBlocked
        && (
            hardSignals.closing
            || exitRisk === "high"
        )
    ) {
        showWhatsapp = true;
        decisionType = "cta";
    } else if (
        turn === 2
        && !ctaBlocked
        && !cooldownBlocked
        && (
            state.conversionSeedDelivered
            || hasUsefulContext(
                generated,
                hardSignals
            )
            || modelWantsCta
        )
    ) {
        showWhatsapp = true;
        decisionType = "cta";
    } else if (
        turn >= conversionConfig.forceDecisionTurn
    ) {
        if (needsHuman) {
            decisionType = "human";
        } else if (
            generated.ctaRecommendation === "suppress"
            || ctaBlocked
            || cooldownBlocked
        ) {
            decisionType = "suppress";
            suppressReason =
                suppressReason
                || (
                    cooldownBlocked
                    ? "cta_cooldown"
                    : "policy_suppressed"
                );
        } else {
            showWhatsapp = true;
            decisionType = "cta";
        }
    } else if (
        modelWantsCta
        && hasUsefulContext(
            generated,
            hardSignals
        )
        && !ctaBlocked
        && !cooldownBlocked
    ) {
        showWhatsapp = true;
        decisionType = "cta";
    }

    const replyText = normalizeReply({
        replyText: generated.replyText,
        latestMessage,
        showWhatsapp,
        refusal: hardSignals.refusal,
        noQuestion:
            hardSignals.closing
            || exitRisk === "high"
            || finalAiReply,
        finalWhatsapp:
            mandatoryFinalWhatsapp,
        generated
    });

    return {
        replyText,
        showWhatsapp,
        needsHuman,
        decisionType,
        suppressReason,
        doNotPush: hardSignals.refusal,
        exitRisk,
        hardSignals,
        currentTurn: turn,
        aiReplyNumber,
        finalAiReply,
        mandatoryFinalWhatsapp,
        trackingId: null,
        closeConversation: false
    };
}


module.exports = {
    detectHardSignals,
    apply
};
