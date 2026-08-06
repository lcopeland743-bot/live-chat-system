/**
 * Meridian Landing Context Utilities
 *
 * Version: v1.0.0
 */

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
        whatsappRouteKey
    };
}

module.exports = {
    normalizeIdentifier,
    normalizeLandingContext
};
