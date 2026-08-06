/**
 * Meridian WhatsApp Settings and Routing Service
 *
 * Version:
 * v2.5.0
 *
 * Resolution order:
 * 1. Route-specific number from the admin-managed number library
 * 2. Admin-managed global default number
 * 3. Environment fallback number
 * 4. Disabled when no valid enabled destination exists
 *
 * An explicit admin pause disables every route and prevents environment
 * fallback until the administrator enables WhatsApp again.
 */

const crypto = require("crypto");

const WhatsappSettings =
require("../database/models/whatsapp-settings-model");

const conversionConfig =
require("../config/conversion-config");

const whatsappSettingsUtils =
require("../utils/whatsapp-settings-utils");

const SETTINGS_KEY = "global";

const {
    normalizePhoneNumber,
    normalizeRouteKey,
    normalizeNumberId,
    sanitizeLabel,
    sanitizePrefill,
    normalizeNumberEntries,
    normalizeRouteEntries,
    storedSettings
} = whatsappSettingsUtils;

function environmentSettings(source = "environment") {
    const number = normalizePhoneNumber(
        conversionConfig.whatsapp.phoneNumber
    );

    const enabled = Boolean(
        conversionConfig.whatsapp.enabled
        && number
    );

    return {
        enabled,
        masterEnabled: enabled,
        number,
        hasNumber: Boolean(number),
        previousNumber: "",
        numbers: [],
        routes: [],
        available: enabled,
        source,
        resolutionSource: source,
        hasStoredSettings: false,
        updatedAt: null,
        updatedBy: "",
        routeKey: "",
        numberId: "",
        label: "",
        fallbackUsed: false
    };
}

function invalidateCache() {
    // Stable API retained. Settings are read live from MongoDB.
}

function createError(code, message, statusCode = 400) {
    const error = new Error(message);
    error.code = code;
    error.statusCode = statusCode;
    return error;
}

function normalizeUpdatedBy(value) {
    return String(value || "admin")
        .trim()
        .slice(0, 128);
}

function getRouteKey(options) {
    if (typeof options === "string") {
        return normalizeRouteKey(options);
    }

    if (options && typeof options === "object") {
        return normalizeRouteKey(options.routeKey);
    }

    return "";
}

async function readStoredDocument() {
    return await WhatsappSettings
        .findOne({ settingsKey: SETTINGS_KEY })
        .lean();
}

function activeLibraryNumbers(settings) {
    return (settings.numbers || []).filter((entry) => (
        entry.enabled === true
        && Boolean(normalizePhoneNumber(entry.number))
    ));
}

function resolveStoredSettings(settings, routeKey = "") {
    const normalizedRouteKey = normalizeRouteKey(routeKey);
    const environment = environmentSettings(
        "environment-fallback"
    );

    if (settings.masterEnabled !== true) {
        return {
            ...settings,
            enabled: false,
            number: settings.number || "",
            hasNumber: Boolean(settings.number),
            available: false,
            source: "admin",
            resolutionSource: "admin-disabled",
            routeKey: normalizedRouteKey,
            numberId: "",
            label: "",
            fallbackUsed: false
        };
    }

    if (normalizedRouteKey) {
        const binding = (settings.routes || []).find(
            (entry) => entry.routeKey === normalizedRouteKey
        );

        if (binding) {
            const destination = (settings.numbers || []).find(
                (entry) => (
                    entry.numberId === binding.numberId
                    && entry.enabled === true
                    && Boolean(entry.number)
                )
            );

            if (destination) {
                return {
                    ...settings,
                    enabled: true,
                    number: destination.number,
                    hasNumber: true,
                    available: true,
                    source: "admin-route",
                    resolutionSource: "admin-route",
                    routeKey: normalizedRouteKey,
                    numberId: destination.numberId,
                    label: destination.label,
                    fallbackUsed: false
                };
            }
        }
    }

    if (settings.number) {
        return {
            ...settings,
            enabled: true,
            hasNumber: true,
            available: true,
            source: "admin",
            resolutionSource: "admin-global",
            routeKey: normalizedRouteKey,
            numberId: "",
            label: "Global default",
            fallbackUsed: Boolean(normalizedRouteKey)
        };
    }

    if (environment.enabled && environment.number) {
        return {
            ...settings,
            enabled: true,
            number: environment.number,
            hasNumber: true,
            available: true,
            source: "environment-fallback",
            resolutionSource: "environment-fallback",
            routeKey: normalizedRouteKey,
            numberId: "",
            label: "Environment fallback",
            fallbackUsed: true
        };
    }

    return {
        ...settings,
        enabled: false,
        number: "",
        hasNumber: false,
        available: activeLibraryNumbers(settings).length > 0,
        source: "admin",
        resolutionSource: "unavailable",
        routeKey: normalizedRouteKey,
        numberId: "",
        label: "",
        fallbackUsed: false
    };
}

async function getResolvedSettings(options = {}) {
    const routeKey = getRouteKey(options);

    try {
        const document = await readStoredDocument();

        if (!document) {
            return {
                ...environmentSettings(),
                routeKey
            };
        }

        return resolveStoredSettings(
            storedSettings(document),
            routeKey
        );
    } catch (error) {
        console.error(
            "[WhatsApp Settings Read Error]",
            error
        );

        return {
            ...environmentSettings(
                "environment-fallback"
            ),
            routeKey
        };
    }
}

async function getAdminSettings() {
    try {
        const document = await readStoredDocument();

        if (!document) {
            return environmentSettings();
        }

        const settings = storedSettings(document);
        const environment = environmentSettings(
            "environment-fallback"
        );

        return {
            ...settings,
            environmentFallbackEnabled:
                environment.enabled,
            environmentFallbackNumber:
                environment.number,
            available: Boolean(
                settings.masterEnabled
                && (
                    settings.number
                    || activeLibraryNumbers(settings).length
                    || environment.enabled
                )
            )
        };
    } catch (error) {
        console.error(
            "[WhatsApp Admin Settings Read Error]",
            error
        );

        return environmentSettings(
            "environment-fallback"
        );
    }
}

async function writeSettings(setValues, setOnInsert = {}) {
    const document = await WhatsappSettings
        .findOneAndUpdate(
            { settingsKey: SETTINGS_KEY },
            {
                $set: setValues,
                $setOnInsert: {
                    settingsKey: SETTINGS_KEY,
                    ...setOnInsert
                }
            },
            {
                upsert: true,
                new: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        )
        .lean();

    invalidateCache();
    return document;
}

async function saveSettings({
    number,
    enabled,
    updatedBy
}) {
    const normalizedNumber =
        normalizePhoneNumber(number);

    const shouldEnable = enabled === true;
    const currentDocument = await readStoredDocument();
    const currentSettings = currentDocument
        ? storedSettings(currentDocument)
        : environmentSettings();

    const hasAlternative = Boolean(
        activeLibraryNumbers(currentSettings).length
        || environmentSettings().enabled
    );

    if (
        shouldEnable
        && !normalizedNumber
        && !hasAlternative
    ) {
        throw createError(
            "INVALID_WHATSAPP_SETTINGS",
            "A valid global number or at least one enabled library number is required before enabling."
        );
    }

    const currentNumber = normalizePhoneNumber(
        currentDocument
        ? currentDocument.activeNumber
        : currentSettings.number
    );

    let previousNumber = normalizePhoneNumber(
        currentDocument && currentDocument.previousNumber
    );

    if (
        currentNumber
        && normalizedNumber !== currentNumber
    ) {
        previousNumber = currentNumber;
    }

    const document = await writeSettings(
        {
            enabled: shouldEnable,
            activeNumber: normalizedNumber,
            previousNumber,
            updatedBy: normalizeUpdatedBy(updatedBy)
        },
        {
            numbers: [],
            routes: []
        }
    );

    return resolveStoredSettings(
        storedSettings(document)
    );
}

async function disableSettings({ updatedBy }) {
    const current = await getAdminSettings();

    return saveSettings({
        number: current.number,
        enabled: false,
        updatedBy
    });
}

async function restorePrevious({ updatedBy }) {
    const currentDocument = await readStoredDocument();
    const current = currentDocument
        ? storedSettings(currentDocument)
        : environmentSettings();

    const activeNumber = normalizePhoneNumber(
        current.number
    );
    const previousNumber = normalizePhoneNumber(
        current.previousNumber
    );

    if (!previousNumber) {
        throw createError(
            "NO_PREVIOUS_WHATSAPP_NUMBER",
            "No previous WhatsApp number is available.",
            409
        );
    }

    const document = await writeSettings(
        {
            enabled: true,
            activeNumber: previousNumber,
            previousNumber: activeNumber,
            updatedBy: normalizeUpdatedBy(updatedBy)
        },
        {
            numbers: [],
            routes: []
        }
    );

    return resolveStoredSettings(
        storedSettings(document)
    );
}

function createNumberId(label, number, existingIds) {
    const base = String(label || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48)
        || `number-${String(number || "").slice(-4)}`;

    let candidate = normalizeNumberId(base)
        || `wa-${crypto.randomUUID().slice(0, 8)}`;

    while (existingIds.has(candidate)) {
        candidate = `${base.slice(0, 60)}-${crypto.randomUUID().slice(0, 6)}`;
    }

    return candidate;
}

async function saveNumber({
    numberId,
    label,
    number,
    enabled,
    updatedBy
}) {
    const normalizedNumber = normalizePhoneNumber(number);
    const normalizedLabel = sanitizeLabel(label);

    if (!normalizedNumber) {
        throw createError(
            "INVALID_WHATSAPP_NUMBER",
            "A valid 7–15 digit international WhatsApp number is required."
        );
    }

    if (!normalizedLabel) {
        throw createError(
            "INVALID_WHATSAPP_NUMBER_LABEL",
            "A label is required for the WhatsApp number."
        );
    }

    const currentDocument = await readStoredDocument();
    const current = currentDocument
        ? storedSettings(currentDocument)
        : environmentSettings();
    const numbers = normalizeNumberEntries(current.numbers);
    const routes = normalizeRouteEntries(current.routes);
    const requestedId = normalizeNumberId(numberId);
    const existingIds = new Set(
        numbers.map((entry) => entry.numberId)
    );
    const finalNumberId = requestedId
        || createNumberId(
            normalizedLabel,
            normalizedNumber,
            existingIds
        );
    const index = numbers.findIndex(
        (entry) => entry.numberId === finalNumberId
    );
    const entry = {
        numberId: finalNumberId,
        label: normalizedLabel,
        number: normalizedNumber,
        enabled: enabled !== false,
        updatedAt: new Date().toISOString(),
        updatedBy: normalizeUpdatedBy(updatedBy)
    };

    if (index >= 0) {
        numbers[index] = entry;
    } else {
        numbers.push(entry);
    }

    const document = await writeSettings(
        {
            enabled:
                current.masterEnabled === true,
            activeNumber:
                current.hasStoredSettings
                ? current.number
                : current.number,
            previousNumber: current.previousNumber,
            numbers,
            routes,
            updatedBy: normalizeUpdatedBy(updatedBy)
        }
    );

    return getAdminSettingsFromDocument(document);
}

function getAdminSettingsFromDocument(document) {
    const settings = storedSettings(document);
    const environment = environmentSettings(
        "environment-fallback"
    );

    return {
        ...settings,
        environmentFallbackEnabled:
            environment.enabled,
        environmentFallbackNumber:
            environment.number,
        available: Boolean(
            settings.masterEnabled
            && (
                settings.number
                || activeLibraryNumbers(settings).length
                || environment.enabled
            )
        )
    };
}

async function deleteNumber({ numberId, updatedBy }) {
    const id = normalizeNumberId(numberId);

    if (!id) {
        throw createError(
            "INVALID_WHATSAPP_NUMBER_ID",
            "Invalid WhatsApp number ID."
        );
    }

    const currentDocument = await readStoredDocument();

    if (!currentDocument) {
        throw createError(
            "WHATSAPP_NUMBER_NOT_FOUND",
            "WhatsApp number not found.",
            404
        );
    }

    const current = storedSettings(currentDocument);
    const binding = current.routes.find(
        (entry) => entry.numberId === id
    );

    if (binding) {
        throw createError(
            "WHATSAPP_NUMBER_IN_USE",
            `Remove route binding ${binding.routeKey} before deleting this number.`,
            409
        );
    }

    const numbers = current.numbers.filter(
        (entry) => entry.numberId !== id
    );

    if (numbers.length === current.numbers.length) {
        throw createError(
            "WHATSAPP_NUMBER_NOT_FOUND",
            "WhatsApp number not found.",
            404
        );
    }

    const document = await writeSettings({
        numbers,
        updatedBy: normalizeUpdatedBy(updatedBy)
    });

    return getAdminSettingsFromDocument(document);
}

async function saveRouteBinding({
    routeKey,
    numberId,
    updatedBy
}) {
    const normalizedRoute = normalizeRouteKey(routeKey);
    const normalizedNumberId = normalizeNumberId(numberId);

    if (!normalizedRoute) {
        throw createError(
            "INVALID_WHATSAPP_ROUTE_KEY",
            "Route key must use lowercase letters, numbers, hyphens, or underscores."
        );
    }

    if (!normalizedNumberId) {
        throw createError(
            "INVALID_WHATSAPP_NUMBER_ID",
            "Select a valid WhatsApp number."
        );
    }

    const currentDocument = await readStoredDocument();

    if (!currentDocument) {
        throw createError(
            "WHATSAPP_NUMBER_NOT_FOUND",
            "Create a WhatsApp number before assigning a route.",
            404
        );
    }

    const current = storedSettings(currentDocument);
    const destination = current.numbers.find(
        (entry) => entry.numberId === normalizedNumberId
    );

    if (!destination) {
        throw createError(
            "WHATSAPP_NUMBER_NOT_FOUND",
            "The selected WhatsApp number does not exist.",
            404
        );
    }

    const routes = current.routes.filter(
        (entry) => entry.routeKey !== normalizedRoute
    );

    routes.push({
        routeKey: normalizedRoute,
        numberId: normalizedNumberId,
        updatedAt: new Date().toISOString(),
        updatedBy: normalizeUpdatedBy(updatedBy)
    });

    const document = await writeSettings({
        routes,
        updatedBy: normalizeUpdatedBy(updatedBy)
    });

    return getAdminSettingsFromDocument(document);
}

async function deleteRouteBinding({ routeKey, updatedBy }) {
    const normalizedRoute = normalizeRouteKey(routeKey);

    if (!normalizedRoute) {
        throw createError(
            "INVALID_WHATSAPP_ROUTE_KEY",
            "Invalid WhatsApp route key."
        );
    }

    const currentDocument = await readStoredDocument();

    if (!currentDocument) {
        throw createError(
            "WHATSAPP_ROUTE_NOT_FOUND",
            "WhatsApp route not found.",
            404
        );
    }

    const current = storedSettings(currentDocument);
    const routes = current.routes.filter(
        (entry) => entry.routeKey !== normalizedRoute
    );

    if (routes.length === current.routes.length) {
        throw createError(
            "WHATSAPP_ROUTE_NOT_FOUND",
            "WhatsApp route not found.",
            404
        );
    }

    const document = await writeSettings({
        routes,
        updatedBy: normalizeUpdatedBy(updatedBy)
    });

    return getAdminSettingsFromDocument(document);
}

function buildInternalUrl(prefill = "", routeKey = "") {
    return whatsappSettingsUtils.buildInternalUrl(
        prefill,
        conversionConfig.whatsapp.redirectPath,
        routeKey
    );
}

function buildExternalUrl(number, prefill = "") {
    return whatsappSettingsUtils
        .buildExternalUrl(number, prefill);
}

module.exports = {
    normalizePhoneNumber,
    normalizeRouteKey,
    normalizeNumberId,
    sanitizePrefill,
    environmentSettings,
    storedSettings,
    resolveStoredSettings,
    getResolvedSettings,
    getAdminSettings,
    saveSettings,
    disableSettings,
    restorePrevious,
    saveNumber,
    deleteNumber,
    saveRouteBinding,
    deleteRouteBinding,
    buildInternalUrl,
    buildExternalUrl,
    invalidateCache
};
