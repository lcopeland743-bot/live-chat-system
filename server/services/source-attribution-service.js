/**
 * Meridian Source Attribution Service
 *
 * Builds trusted Campaign attribution for admin-facing session payloads.
 * Campaign identity always comes from the backend registry. Only the four
 * approved first-touch UTM values may accompany that identity.
 */

"use strict";

const {
    getAnalysisCampaign
}
=
require("../config/analysis-campaign-registry");


const {
    MAX_UTM_LENGTH,
    normalizeUtmValue
}
=
require("../utils/landing-context-utils");


const UTM_FIELDS = Object.freeze([
    Object.freeze({
        contextKey: "utmSource",
        queryKey: "utm_source"
    }),
    Object.freeze({
        contextKey: "utmMedium",
        queryKey: "utm_medium"
    }),
    Object.freeze({
        contextKey: "utmCampaign",
        queryKey: "utm_campaign"
    }),
    Object.freeze({
        contextKey: "utmContent",
        queryKey: "utm_content"
    })
]);


function normalizeApprovedUtm(value) {
    const source =
        value && typeof value === "object"
        ? value
        : {};

    const result = {};

    for (const field of UTM_FIELDS) {
        const normalized =
            normalizeUtmValue(
                source[field.contextKey]
            );

        if (normalized) {
            result[field.contextKey] =
                normalized;
        }
    }

    return result;
}


function attachApprovedUtm(
    trustedLandingContext,
    untrustedLandingContext
) {
    if (!trustedLandingContext) {
        return null;
    }

    return {
        ...trustedLandingContext,
        ...normalizeApprovedUtm(
            untrustedLandingContext
        )
    };
}


function buildSourceAttribution(value) {
    const landingContext =
        value
        && value.landingContext
        && typeof value.landingContext === "object"
        ? value.landingContext
        : value && typeof value === "object"
        ? value
        : {};

    const campaign =
        getAnalysisCampaign(
            landingContext.campaignId
        );

    if (!campaign) {
        return null;
    }

    const canonical =
        campaign.landingContext;

    return {
        campaignId:
            campaign.campaignId,
        campaignName:
            campaign.title,
        landingPath:
            campaign.landingPath,
        pageId:
            canonical.pageId,
        pageFamily:
            canonical.pageFamily,
        ...normalizeApprovedUtm(
            landingContext
        )
    };
}


function toPlainObject(value) {
    if (!value) {
        return null;
    }

    if (typeof value.toObject === "function") {
        return value.toObject();
    }

    return {
        ...value
    };
}


function serializeAdminSession(session) {
    const plain =
        toPlainObject(session);

    if (!plain) {
        return null;
    }

    plain.sourceAttribution =
        buildSourceAttribution(plain);

    return plain;
}


module.exports = {
    MAX_UTM_LENGTH,
    UTM_FIELDS,
    normalizeUtmValue,
    normalizeApprovedUtm,
    attachApprovedUtm,
    buildSourceAttribution,
    serializeAdminSession
};
