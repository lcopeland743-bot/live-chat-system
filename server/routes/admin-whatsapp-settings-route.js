/**
 * Meridian Admin WhatsApp Settings and Routing Routes
 *
 * Version:
 * v2.5.0
 */

const express = require("express");
const router = express.Router();

const {
    requireAdminApi,
    setNoStore
} = require("../middleware/admin-auth-middleware");

const whatsappSettingsService =
require("../services/whatsapp-settings-service");

router.use(setNoStore);
router.use(requireAdminApi);

function adminName(req) {
    return (
        req.session
        && req.session.admin
        && req.session.admin.username
        ? req.session.admin.username
        : "admin"
    );
}

function handleError(res, error) {
    const status =
        Number(error && error.statusCode)
        || 500;

    if (status >= 500) {
        console.error(
            "[Admin WhatsApp Settings Error]",
            error
        );
    }

    return res.status(status).json({
        success: false,
        code:
            error && error.code
            ? error.code
            : "WHATSAPP_SETTINGS_ERROR",
        message:
            error && error.message
            ? error.message
            : "Unable to update WhatsApp settings"
    });
}

router.get("/", async (req, res) => {
    try {
        const settings = await whatsappSettingsService
            .getAdminSettings();

        return res.json({
            success: true,
            settings
        });
    } catch (error) {
        return handleError(res, error);
    }
});

router.put("/", async (req, res) => {
    try {
        await whatsappSettingsService.saveSettings({
            number: req.body.number,
            enabled: req.body.enabled === true,
            updatedBy: adminName(req)
        });

        const settings = await whatsappSettingsService
            .getAdminSettings();

        return res.json({
            success: true,
            settings
        });
    } catch (error) {
        return handleError(res, error);
    }
});

router.post("/disable", async (req, res) => {
    try {
        await whatsappSettingsService.disableSettings({
            updatedBy: adminName(req)
        });

        const settings = await whatsappSettingsService
            .getAdminSettings();

        return res.json({
            success: true,
            settings
        });
    } catch (error) {
        return handleError(res, error);
    }
});

router.post("/restore", async (req, res) => {
    try {
        await whatsappSettingsService.restorePrevious({
            updatedBy: adminName(req)
        });

        const settings = await whatsappSettingsService
            .getAdminSettings();

        return res.json({
            success: true,
            settings
        });
    } catch (error) {
        return handleError(res, error);
    }
});

router.post("/numbers", async (req, res) => {
    try {
        const settings = await whatsappSettingsService
            .saveNumber({
                numberId: req.body.numberId,
                label: req.body.label,
                number: req.body.number,
                enabled: req.body.enabled !== false,
                updatedBy: adminName(req)
            });

        return res.json({
            success: true,
            settings
        });
    } catch (error) {
        return handleError(res, error);
    }
});

router.delete("/numbers/:numberId", async (req, res) => {
    try {
        const settings = await whatsappSettingsService
            .deleteNumber({
                numberId: req.params.numberId,
                updatedBy: adminName(req)
            });

        return res.json({
            success: true,
            settings
        });
    } catch (error) {
        return handleError(res, error);
    }
});

router.put("/routes/:routeKey", async (req, res) => {
    try {
        const settings = await whatsappSettingsService
            .saveRouteBinding({
                routeKey: req.params.routeKey,
                numberId: req.body.numberId,
                updatedBy: adminName(req)
            });

        return res.json({
            success: true,
            settings
        });
    } catch (error) {
        return handleError(res, error);
    }
});

router.delete("/routes/:routeKey", async (req, res) => {
    try {
        const settings = await whatsappSettingsService
            .deleteRouteBinding({
                routeKey: req.params.routeKey,
                updatedBy: adminName(req)
            });

        return res.json({
            success: true,
            settings
        });
    } catch (error) {
        return handleError(res, error);
    }
});

module.exports = router;
