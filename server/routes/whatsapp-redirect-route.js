/**
 * Meridian WhatsApp Redirect Routes
 *
 * Version:
 * v2.5.0
 */

const express = require("express");
const router = express.Router();

const whatsappSettingsService =
require("../services/whatsapp-settings-service");

function setNoStore(res) {
    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
    );
}

function unavailable(res) {
    return res
        .status(503)
        .type("html")
        .send(
            "<!doctype html><html><head>"
            + "<meta charset=\"utf-8\">"
            + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
            + "<title>WhatsApp unavailable</title>"
            + "</head><body style=\"font-family:Arial,sans-serif;padding:32px;line-height:1.5\">"
            + "<h1 style=\"font-size:22px\">WhatsApp is not available right now.</h1>"
            + "<p>Please return to the chat window and continue speaking with customer service.</p>"
            + "</body></html>"
        );
}

async function redirectToWhatsapp(req, res, routeKey = "") {
    setNoStore(res);

    try {
        const settings = await whatsappSettingsService
            .getResolvedSettings({ routeKey });

        if (
            !settings.enabled
            || !settings.number
        ) {
            return unavailable(res);
        }

        const target = whatsappSettingsService
            .buildExternalUrl(
                settings.number,
                req.query.text
            );

        if (!target) {
            return unavailable(res);
        }

        return res.redirect(302, target);
    } catch (error) {
        console.error(
            "[WhatsApp Redirect Error]",
            error
        );

        return res.status(503).send(
            "WhatsApp is temporarily unavailable."
        );
    }
}

router.get("/go/whatsapp", async (req, res) => {
    return redirectToWhatsapp(req, res, "");
});

router.get("/go/whatsapp/:routeKey", async (req, res) => {
    const routeKey = whatsappSettingsService
        .normalizeRouteKey(req.params.routeKey);

    if (!routeKey) {
        setNoStore(res);
        return res.status(400).send(
            "Invalid WhatsApp route."
        );
    }

    return redirectToWhatsapp(req, res, routeKey);
});

module.exports = router;
