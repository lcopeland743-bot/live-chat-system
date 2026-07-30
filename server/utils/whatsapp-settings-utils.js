/**
 * Meridian WhatsApp Settings Utilities
 *
 * Version:
 * v2.4.2
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

function sanitizePrefill(value) {
    return String(value || "")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 500);
}

function storedSettings(document) {
    const number = normalizePhoneNumber(
        document && document.activeNumber
    );

    const previousNumber = normalizePhoneNumber(
        document && document.previousNumber
    );

    return {
        enabled: Boolean(
            document
            && document.enabled === true
            && number
        ),
        number,
        hasNumber: Boolean(number),
        previousNumber,
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
    redirectPath = "/go/whatsapp"
) {
    const text = sanitizePrefill(prefill);

    if (!text) {
        return redirectPath;
    }

    return (
        redirectPath
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
    sanitizePrefill,
    storedSettings,
    buildInternalUrl,
    buildExternalUrl
};
