/**
 * Meridian Landing Context Utilities
 *
 * Version: v1.0.0
 */

const MAX_UTM_LENGTH = 200;

const APPROVED_UTM_CONTEXT_FIELDS =
Object.freeze([
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "utmContent"
]);

function normalizeIdentifier(value, maximum = 100) {
    const text = String(value || "")
        .trim()
        .toLowerCase();

    if (
        !text
        || text.length > maximum
        || !/^[a-z0-9][a-z0-9_-]*$/.test(text)
    ) {
        return "";
    }

    return text;
}

function normalizeUtmValue(value) {
    if (typeof value !== "string") {
        return "";
    }

    const normalized = value.trim();

    if (
        !normalized
        || normalized.length > MAX_UTM_LENGTH
        || /[\u0000-\u001f\u007f]/.test(normalized)
    ) {
        return "";
    }

    return normalized;
}

function normalizeLandingContext(value) {
    const source = value && typeof value === "object"
        ? value
        : {};

    const pageId = normalizeIdentifier(source.pageId, 100);
    const pageFamily = normalizeIdentifier(source.pageFamily, 100);
    const variantId = normalizeIdentifier(source.variantId, 40);
    const campaignId = normalizeIdentifier(source.campaignId, 120);
    const whatsappRouteKey = normalizeIdentifier(
        source.whatsappRouteKey || pageId,
        100
    );

    const approvedUtm = {};

    for (
        const key
        of APPROVED_UTM_CONTEXT_FIELDS
    ) {
        const text =
            normalizeUtmValue(source[key]);

        if (text) {
            approvedUtm[key] = text;
        }
    }

    if (
        !pageId
        && !campaignId
        && !whatsappRouteKey
    ) {
        return null;
    }

    return {
        pageId,
        pageFamily,
        variantId,
        campaignId,
        whatsappRouteKey,
        ...approvedUtm
    };
}

module.exports = {
    MAX_UTM_LENGTH,
    APPROVED_UTM_CONTEXT_FIELDS,
    normalizeIdentifier,
    normalizeUtmValue,
    normalizeLandingContext
};
