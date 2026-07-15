/**
 * Meridian WhatsApp Conversion Service
 *
 * Version:
 * v2.3.0
 */

const crypto =
require("crypto");


const conversionConfig =
require("../config/conversion-config");


const {
    containsCjk,
    cleanReplyText,
    limitCharacters
}
=
require("../utils/conversion-text");


function sanitizePrefill(value) {
    return String(value || "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);
}


function defaultTitle({
    asset,
    latestMessage
}) {
    if (containsCjk(latestMessage)) {
        return asset
            ? `查看${asset}下一步决策信号`
            : "查看下一步决策信号";
    }

    return asset
        ? `See the next ${asset} decision signals`
        : "See the next decision signals";
}


function defaultButton({
    asset,
    latestMessage
}) {
    if (containsCjk(latestMessage)) {
        return asset
            ? `查看${asset}信号`
            : "查看关键信号";
    }

    return asset
        ? `View ${asset} signals`
        : "View key signals";
}


function defaultPrefill({
    generated,
    state,
    latestMessage
}) {
    const asset =
        generated.asset
        || state.asset
        || "";

    const reserved =
        generated.reservedValue
        || state.reservedValue
        || "";

    if (containsCjk(latestMessage)) {
        return [
            "你好，我想继续了解",
            asset ? `${asset}的` : "",
            reserved || "关键决策信号、风险条件和下一步判断。"
        ].join("");
    }

    return [
        "Hi, I want to continue with ",
        asset ? `${asset}: ` : "",
        reserved || "the key decision signals, risks, and next-step conditions."
    ].join("");
}


function createTrackingId() {
    return (
        "cta_"
        + crypto.randomUUID()
    );
}


function createCard({
    generated,
    state,
    decision,
    latestMessage
}) {
    if (
        !conversionConfig.whatsapp.enabled
        || !decision.showWhatsapp
    ) {
        return null;
    }

    const asset =
        generated.asset
        || state.asset
        || null;

    const trackingId =
        createTrackingId();

    const title = limitCharacters(
        cleanReplyText(
            generated.ctaTitle
            || defaultTitle({
                asset,
                latestMessage
            })
        ),
        45
    );

    const buttonText = limitCharacters(
        cleanReplyText(
            generated.ctaButtonText
            || defaultButton({
                asset,
                latestMessage
            })
        ),
        24
    );

    const prefill =
        sanitizePrefill(
            generated.whatsappPrefill
            || defaultPrefill({
                generated,
                state,
                latestMessage
            })
        )
        || defaultPrefill({
            generated,
            state,
            latestMessage
        });

    const url =
        `https://wa.me/${conversionConfig.whatsapp.phoneNumber}`
        + `?text=${encodeURIComponent(prefill)}`;

    const ctaVariant = [
        generated.intent || "unknown",
        generated.reservedValueType || "none"
    ].join(":");

    return {
        type: "link-card",
        content: url,
        metadata: {
            platform: "whatsapp",
            source: "conversion-engine",
            title,
            buttonText,
            url,
            trackingId,
            trackingUrl:
                conversionConfig.whatsapp.clickEndpoint,
            conversionStage: "cta_sent",
            intent:
                generated.intent
                || state.intent
                || "unknown",
            asset,
            ctaTurn: decision.currentTurn,
            ctaVariant,
            prefill
        }
    };
}


module.exports = {
    createCard
};
