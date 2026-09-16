/**
 * Meridian Analysis Campaign Registry
 *
 * Backend-owned allowlist for the shared analysis entry.
 */

"use strict";

function createCampaign({
    campaignId,
    campaignName,
    landingPath,
    pageId,
    pageFamily,
    initialQuestion
}) {
    const landingContext = Object.freeze({
        pageId,
        pageFamily,
        variantId: "",
        campaignId
    });

    return Object.freeze({
        enabled: true,
        campaignId,
        campaignName,
        title: campaignName,
        landingPath,
        pageId,
        pageFamily,
        variantId: "",
        initialQuestion,
        landingContext
    });
}

const campaign001 = createCampaign({
    campaignId: "001",
    campaignName: "Beyond the Headlines",
    landingPath: "/lp/001-beyond-the-headlines/",
    pageId: "001-beyond-the-headlines",
    pageFamily: "beyond-the-headlines",
    initialQuestion:
        "What changed behind the move, and what evidence would change your interpretation?"
});

const campaign002 = createCampaign({
    campaignId: "002",
    campaignName: "The AGI Repricing",
    landingPath: "/lp/002-agi-repricing/",
    pageId: "002-agi-repricing",
    pageFamily: "agi-repricing",
    initialQuestion:
        "Which constraint—compute, memory, power, grid access, capital, or uncertainty—most limits the path from AI capability to useful scale?"
});

const campaign003 = createCampaign({
    campaignId: "003",
    campaignName: "The Weight of the Index",
    landingPath: "/lp/003-weight-of-the-index/",
    pageId: "003-weight-of-the-index",
    pageFamily: "weight-of-the-index",
    initialQuestion:
        "Which weights, shared exposures, and evidence matter most when examining what really carries a broad market-cap-weighted index?"
});

const campaign004 = createCampaign({
    campaignId: "004",
    campaignName: "When Machines Become Work",
    landingPath: "/lp/004-when-machines-become-work/",
    pageId: "004-when-machines-become-work",
    pageFamily: "when-machines-become-work",
    initialQuestion:
        "What assumptions, constraints, and evidence determine whether a robotics system can become economically meaningful work?"
});

const campaigns = Object.freeze({
    "001": campaign001,
    "002": campaign002,
    "003": campaign003,
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

function getAnalysisCampaignByLandingPath(landingPath) {
    if (typeof landingPath !== "string") {
        return null;
    }

    return Object.values(campaigns).find((campaign) => (
        campaign.enabled === true
        && campaign.landingPath === landingPath
    )) || null;
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
    getAnalysisCampaignByLandingPath,
    resolveAnalysisLandingContext
};
