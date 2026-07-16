/**
 * Meridian WhatsApp Conversion Service
 *
 * Version:
 * v2.3.4
 */

const crypto =
require("crypto");


const conversionConfig =
require("../config/conversion-config");


const {
    cleanReplyText,
    limitCharacters
}
=
require("../utils/conversion-text");


const conversationLanguageService =
require("./conversation-language-service");


function sanitizePrefill(value) {
    return String(value || "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);
}


function resolveLanguage({
    generated,
    latestMessage
}) {
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


function safeLocalizedField({
    value,
    fallbackKey,
    language,
    values,
    forceFallback = false
}) {
    if (
        !forceFallback
        && value
        && conversationLanguageService
            .isTextCompatible(
                value,
                language
            )
    ) {
        return value;
    }

    return conversationLanguageService
        .getLocalized(
            fallbackKey,
            language,
            values
        );
}


function defaultPrefill({
    generated,
    state,
    language
}) {
    const asset =
        generated.asset
        || state.asset
        || "";

    return conversationLanguageService
        .getLocalized(
            "prefill",
            language,
            {
                asset:
                    asset
                    || "the market"
            }
        );
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

    const language =
        resolveLanguage({
            generated,
            latestMessage
        });

    const trackingId =
        createTrackingId();

    const forceFinal =
        decision.finalAiReply === true;

    const title = limitCharacters(
        cleanReplyText(
            safeLocalizedField({
                value:
                    generated.ctaTitle,
                fallbackKey:
                    "finalTitle",
                language,
                values: {
                    asset:
                        asset || ""
                },
                forceFallback:
                    forceFinal
            })
        ),
        45
    );

    const buttonText = limitCharacters(
        cleanReplyText(
            safeLocalizedField({
                value:
                    generated.ctaButtonText,
                fallbackKey:
                    "finalButton",
                language,
                values: {
                    asset:
                        asset || ""
                },
                forceFallback:
                    forceFinal
            })
        ),
        24
    );

    const localizedPrefill =
        defaultPrefill({
            generated,
            state,
            language
        });

    const prefill =
        sanitizePrefill(
            forceFinal
            ? localizedPrefill
            : safeLocalizedField({
                value:
                    generated.whatsappPrefill,
                fallbackKey:
                    "prefill",
                language,
                values: {
                    asset:
                        asset || "the market"
                }
            })
        )
        || localizedPrefill;

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
            ctaVariant:
                decision.finalAiReply
                ? `final:${ctaVariant}`
                : ctaVariant,
            finalAiReply:
                decision.finalAiReply === true,
            language:
                language.code,
            prefill
        }
    };
}


module.exports = {
    createCard
};
