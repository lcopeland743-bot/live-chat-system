/**
 * Meridian Analysis Entry Route
 */

"use strict";

const express = require("express");

const {
    getAnalysisCampaign
} = require("../config/analysis-campaign-registry");

const {
    renderAnalysisEntry,
    renderAnalysisEntryError
} = require("../views/analysis-entry");

const router = express.Router();

const CAMPAIGN_PATTERN = /^\d{3}$/;
const MAX_CAMPAIGN_LENGTH = 16;

const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "media-src 'self' blob:",
    "connect-src 'self'",
    "worker-src 'none'",
    "manifest-src 'self'"
].join("; ");

function setAnalysisEntryHeaders(res) {
    res.set({
        "Cache-Control":
            "no-store, no-cache, must-revalidate, private",
        "X-Content-Type-Options":
            "nosniff",
        "Referrer-Policy":
            "strict-origin-when-cross-origin",
        "Content-Security-Policy":
            CONTENT_SECURITY_POLICY
    });
}

function validateCampaignParameter(value) {
    if (value === undefined) {
        return {
            valid: false,
            status: 400,
            code: "MISSING_CAMPAIGN"
        };
    }

    if (
        typeof value !== "string"
        || value.length > MAX_CAMPAIGN_LENGTH
        || !CAMPAIGN_PATTERN.test(value)
    ) {
        return {
            valid: false,
            status: 400,
            code: "INVALID_CAMPAIGN"
        };
    }

    return {
        valid: true,
        campaignId: value
    };
}

function sendError(res, status, title, message) {
    return res
        .status(status)
        .type("html")
        .send(
            renderAnalysisEntryError({
                title,
                message
            })
        );
}

router.get(
    "/analysis/entry",
    (req, res) => {
        setAnalysisEntryHeaders(res);

        const validation =
            validateCampaignParameter(
                req.query
                ? req.query.campaign
                : undefined
            );

        if (!validation.valid) {
            return sendError(
                res,
                validation.status,
                "Invalid analysis link",
                validation.code === "MISSING_CAMPAIGN"
                    ? "This analysis link is missing its campaign identifier."
                    : "This analysis link contains an invalid campaign identifier."
            );
        }

        const campaign = getAnalysisCampaign(
            validation.campaignId
        );

        if (!campaign) {
            return sendError(
                res,
                404,
                "Analysis not found",
                "This campaign analysis is not available."
            );
        }

        return res
            .status(200)
            .type("html")
            .send(renderAnalysisEntry(campaign));
    }
);

module.exports = router;
module.exports.CONTENT_SECURITY_POLICY =
    CONTENT_SECURITY_POLICY;
module.exports.validateCampaignParameter =
    validateCampaignParameter;
