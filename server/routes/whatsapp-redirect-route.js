/**
 * Meridian WhatsApp Redirect Route
 *
 * Version:
 * v2.4.2
 */

const express = require("express");
const router = express.Router();

const whatsappSettingsService =
require("../services/whatsapp-settings-service");

router.get("/go/whatsapp", async (req, res) => {
    res.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, private"
    );

    try {
        const settings = await whatsappSettingsService
            .getResolvedSettings();

        if (
            !settings.enabled
            || !settings.number
        ) {
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

        const target = whatsappSettingsService
            .buildExternalUrl(
                settings.number,
                req.query.text
            );

        if (!target) {
            return res.status(503).send(
                "WhatsApp is not configured."
            );
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
});

module.exports = router;
