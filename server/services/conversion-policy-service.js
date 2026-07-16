/**
 * Meridian Conversion Policy Service
 *
 * Version:
 * v2.3.3
 *
 * The model proposes. This service decides.
 */

const conversionConfig =
require("../config/conversion-config");


const {
    containsCjk,
    cleanReplyText,
    stripWhatsappLanguage,
    countCharacters,
    countQuestions,
    limitCharacters
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


function createFallbackReply(message) {
    if (containsCjk(message)) {
        return "先确认决定走势的变量：价格之外还要看量能。你已持有还是准备入场？";
    }

    return "Price alone is not enough; volume confirms the move. Are you holding or planning to enter?";
}


function createRefusalReply(message) {
    if (containsCjk(message)) {
        return "明白，我们继续在这里沟通，不再发送WhatsApp邀请。";
    }

    return "Understood. We can continue here, and I will not send another WhatsApp invitation.";
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
    noQuestion
}) {
    if (refusal) {
        return createRefusalReply(latestMessage);
    }

    let text = cleanReplyText(replyText);

    if (!showWhatsapp) {
        text = stripWhatsappLanguage(text);
    }

    if (!text) {
        text = createFallbackReply(latestMessage);
    }

    if (noQuestion) {
        text = removeQuestions(text);
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

    const ctaBlocked = Boolean(
        !conversionConfig.whatsapp.enabled
        || state.whatsappClicked
        || state.doNotPush
        || state.humanTakeover
        || hardSignals.refusal
        || state.ctaShownCount >=
            conversionConfig.maxCtaPerSession
    );

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
            || finalAiReply
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
        trackingId: null,
        closeConversation: false
    };
}


module.exports = {
    detectHardSignals,
    apply
};
