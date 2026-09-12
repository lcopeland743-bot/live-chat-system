/**
 * Meridian Analysis Campaign Registry
 *
 * Backend-owned allowlist for the shared analysis entry.
 */

"use strict";

const campaign004Context = Object.freeze({
    pageId:
        "004-when-machines-become-work",
    pageFamily:
        "when-machines-become-work",
    variantId:
        "",
    campaignId:
        "004"
});

const campaign004 = Object.freeze({
    enabled: true,
    campaignId: "004",
    pageId:
        campaign004Context.pageId,
    pageFamily:
        campaign004Context.pageFamily,
    variantId:
        campaign004Context.variantId,
    title:
        "When Machines Become Work",
    landingPath:
        "/lp/004-when-machines-become-work/",
    initialQuestion:
        "What assumptions, constraints, and evidence determine whether a robotics system can become economically meaningful work?",
    landingContext:
        campaign004Context
});

const campaigns = Object.freeze({
    "004": campaign004
});

function getAnalysisCampaign(campaignId) {
    if (
        typeof campaignId !== "string"
        || !Object.prototype.hasOwnProperty.call(
            campaigns,
            campaignId
        )
    ) {
        return null;
    }

    const campaign = campaigns[campaignId];

    return campaign.enabled === true
        ? campaign
        : null;
}

function resolveAnalysisLandingContext(value) {
    const source = value && typeof value === "object"
        ? value
        : {};

    const campaign = getAnalysisCampaign(
        source.campaignId
    );

    return campaign
        ? campaign.landingContext
        : null;
}

module.exports = {
    campaigns,
    getAnalysisCampaign,
    resolveAnalysisLandingContext
};
