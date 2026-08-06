/**
 * Meridian WhatsApp Settings Utilities
 *
 * Version:
 * v2.5.0
 */

function normalizePhoneNumber(value) {
    const digits = String(value || "")
        .replace(/\D/g, "");

    if (
        digits.length < 7
        || digits.length > 15
    ) {
        return "";
    }

    return digits;
}

function normalizeRouteKey(value) {
    const key = String(value || "")
        .trim()
        .toLowerCase();

    if (
        !key
        || key.length > 100
        || !/^[a-z0-9][a-z0-9_-]*$/.test(key)
    ) {
        return "";
    }

    return key;
}

function normalizeNumberId(value) {
    const id = String(value || "")
        .trim()
        .toLowerCase();

    if (
        !id
        || id.length > 80
        || !/^[a-z0-9][a-z0-9_-]*$/.test(id)
    ) {
        return "";
    }

    return id;
}

function sanitizeLabel(value) {
    return String(value || "")
        .replace(/[<>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
}

function sanitizePrefill(value) {
    return String(value || "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);
}

function normalizeNumberEntries(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    const seen = new Set();
    const entries = [];

    value.forEach((entry) => {
        const numberId = normalizeNumberId(
            entry && entry.numberId
        );
        const number = normalizePhoneNumber(
            entry && entry.number
        );
        const label = sanitizeLabel(
            entry && entry.label
        );

        if (
            !numberId
            || !number
            || !label
            || seen.has(numberId)
        ) {
            return;
        }

        seen.add(numberId);
        entries.push({
            numberId,
            label,
            number,
            enabled:
                !entry
                || entry.enabled !== false,
            updatedAt:
                entry && entry.updatedAt
                ? new Date(entry.updatedAt).toISOString()
                : null,
            updatedBy:
                entry && entry.updatedBy
                ? String(entry.updatedBy).slice(0, 128)
                : ""
        });
    });

    return entries;
}

function normalizeRouteEntries(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    const seen = new Set();
    const entries = [];

    value.forEach((entry) => {
        const routeKey = normalizeRouteKey(
            entry && entry.routeKey
        );
        const numberId = normalizeNumberId(
            entry && entry.numberId
        );

        if (
            !routeKey
            || !numberId
            || seen.has(routeKey)
        ) {
            return;
        }

        seen.add(routeKey);
        entries.push({
            routeKey,
            numberId,
            updatedAt:
                entry && entry.updatedAt
                ? new Date(entry.updatedAt).toISOString()
                : null,
            updatedBy:
                entry && entry.updatedBy
                ? String(entry.updatedBy).slice(0, 128)
                : ""
        });
    });

    return entries;
}

function storedSettings(document) {
    const number = normalizePhoneNumber(
        document && document.activeNumber
    );

    const previousNumber = normalizePhoneNumber(
        document && document.previousNumber
    );

    const numbers = normalizeNumberEntries(
        document && document.numbers
    );

    const routes = normalizeRouteEntries(
        document && document.routes
    );

    const masterEnabled = Boolean(
        document && document.enabled === true
    );

    return {
        enabled: Boolean(masterEnabled && number),
        masterEnabled,
        number,
        hasNumber: Boolean(number),
        previousNumber,
        numbers,
        routes,
        available: Boolean(
            masterEnabled
            && (
                number
                || numbers.some((entry) => (
                    entry.enabled === true
                    && entry.number
                ))
            )
        ),
        source: "admin",
        hasStoredSettings: true,
        updatedAt:
            document && document.updatedAt
            ? new Date(document.updatedAt).toISOString()
            : null,
        updatedBy:
            document && document.updatedBy
            ? String(document.updatedBy)
            : ""
    };
}

function buildInternalUrl(
    prefill = "",
    redirectPath = "/go/whatsapp",
    routeKey = ""
) {
    const text = sanitizePrefill(prefill);
    const normalizedRouteKey = normalizeRouteKey(routeKey);
    const path = normalizedRouteKey
        ? `${redirectPath}/${encodeURIComponent(normalizedRouteKey)}`
        : redirectPath;

    if (!text) {
        return path;
    }

    return (
        path
        + "?text="
        + encodeURIComponent(text)
    );
}

function buildExternalUrl(number, prefill = "") {
    const normalizedNumber =
        normalizePhoneNumber(number);

    if (!normalizedNumber) {
        return "";
    }

    const text = sanitizePrefill(prefill);

    return (
        `https://wa.me/${normalizedNumber}`
        + (
            text
            ? `?text=${encodeURIComponent(text)}`
            : ""
        )
    );
}

module.exports = {
    normalizePhoneNumber,
    normalizeRouteKey,
    normalizeNumberId,
    sanitizeLabel,
    sanitizePrefill,
    normalizeNumberEntries,
    normalizeRouteEntries,
    storedSettings,
    buildInternalUrl,
    buildExternalUrl
};
