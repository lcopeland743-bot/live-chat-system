/**
 * Meridian IP Geolocation Service
 *
 * Resolves an approximate country, state/region, city and IANA timezone
 * from the server-observed client IP address. Results are cached by IP.
 * Lookup failures are non-fatal and must not interrupt chat traffic.
 *
 * Version: v1.0.0
 */

const https =
require("https");

const net =
require("net");

const ipGeolocationConfig =
require("../config/ip-geolocation-config");

const {
    normalizeIp
}
=
require("../utils/client-ip");


const MAX_RESPONSE_BYTES =
1024 * 1024;


function isPrivateOrReservedIpv4(ipAddress) {
    const parts =
        ipAddress
        .split(".")
        .map(value => Number(value));

    if (
        parts.length !== 4
        || parts.some(
            value =>
                !Number.isInteger(value)
                || value < 0
                || value > 255
        )
    ) {
        return true;
    }

    const [a, b] = parts;

    return (
        a === 0
        || a === 10
        || a === 127
        || (
            a === 100
            && b >= 64
            && b <= 127
        )
        || (
            a === 169
            && b === 254
        )
        || (
            a === 172
            && b >= 16
            && b <= 31
        )
        || (
            a === 192
            && b === 0
        )
        || (
            a === 192
            && b === 168
        )
        || (
            a === 198
            && (b === 18 || b === 19)
        )
        || (
            a === 198
            && b === 51
        )
        || (
            a === 203
            && b === 0
        )
        || a >= 224
    );
}


function isPrivateOrReservedIpv6(ipAddress) {
    const normalized =
        String(ipAddress || "")
        .trim()
        .toLowerCase();

    return (
        !normalized
        || normalized === "::"
        || normalized === "::1"
        || normalized.startsWith("fc")
        || normalized.startsWith("fd")
        || /^fe[89ab]/.test(normalized)
        || normalized.startsWith("ff")
        || normalized.startsWith("2001:db8:")
    );
}


function isPublicIp(value) {
    const ipAddress =
        normalizeIp(value);

    const version =
        net.isIP(ipAddress);

    if (version === 4) {
        return !isPrivateOrReservedIpv4(
            ipAddress
        );
    }

    if (version === 6) {
        return !isPrivateOrReservedIpv6(
            ipAddress
        );
    }

    return false;
}


function cleanText(value, maximumLength = 160) {
    return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maximumLength);
}


function normalizeLookupResponse(
    ipAddress,
    payload,
    provider = "ipwhois"
) {
    const timezone =
        payload
        && typeof payload.timezone === "object"
        ? payload.timezone
        : {};

    const result = {
        ipAddress:
            normalizeIp(ipAddress),
        country:
            cleanText(payload && payload.country),
        countryCode:
            cleanText(
                payload && payload.country_code,
                8
            )
            .toUpperCase(),
        region:
            cleanText(payload && payload.region),
        regionCode:
            cleanText(
                payload && payload.region_code,
                16
            ),
        city:
            cleanText(payload && payload.city),
        timezone:
            cleanText(timezone.id, 96),
        timezoneAbbr:
            cleanText(timezone.abbr, 16),
        provider:
            cleanText(provider, 32),
        lookupStatus:
            "success",
        updatedAt:
            new Date()
    };

    result.locationLabel =
        [
            result.country,
            result.region,
            result.city
        ]
        .filter(Boolean)
        .join(" · ");

    return result;
}


function requestJson(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        const request =
            https.get(
                url,
                {
                    headers: {
                        Accept:
                            "application/json",
                        "User-Agent":
                            "Meridian-Chat-SDK/2.4.2"
                    }
                },
                response => {
                    const statusCode =
                        Number(response.statusCode || 0);

                    let body = "";
                    let size = 0;

                    response.setEncoding("utf8");

                    response.on(
                        "data",
                        chunk => {
                            size +=
                                Buffer.byteLength(chunk);

                            if (size > MAX_RESPONSE_BYTES) {
                                request.destroy(
                                    new Error(
                                        "IP geolocation response is too large."
                                    )
                                );
                                return;
                            }

                            body += chunk;
                        }
                    );

                    response.on(
                        "end",
                        () => {
                            if (
                                statusCode < 200
                                || statusCode >= 300
                            ) {
                                reject(
                                    new Error(
                                        `IP geolocation HTTP ${statusCode}`
                                    )
                                );
                                return;
                            }

                            try {
                                resolve(JSON.parse(body));
                            }
                            catch (error) {
                                reject(
                                    new Error(
                                        "Invalid IP geolocation JSON response."
                                    )
                                );
                            }
                        }
                    );
                }
            );

        request.setTimeout(
            timeoutMs,
            () => {
                request.destroy(
                    new Error(
                        "IP geolocation request timed out."
                    )
                );
            }
        );

        request.on("error", reject);
    });
}


class IpGeolocationService {
    constructor(options = {}) {
        this.config = {
            ...ipGeolocationConfig,
            ...(options.config || {})
        };

        this.requestJson =
            options.requestJson
            || requestJson;

        this.cache = new Map();
        this.inFlight = new Map();
    }


    getCached(ipAddress) {
        const entry =
            this.cache.get(ipAddress);

        if (!entry) {
            return null;
        }

        if (entry.expiresAt <= Date.now()) {
            this.cache.delete(ipAddress);
            return null;
        }

        return entry.value;
    }


    setCached(ipAddress, value, ttlMs) {
        this.cache.set(
            ipAddress,
            {
                value,
                expiresAt:
                    Date.now() + ttlMs
            }
        );
    }


    shouldRefresh(session, ipAddress) {
        const normalizedIp =
            normalizeIp(ipAddress);

        if (
            !this.config.enabled
            || !isPublicIp(normalizedIp)
        ) {
            return false;
        }

        const geoLocation =
            session
            && session.geoLocation
            ? session.geoLocation
            : null;

        if (
            !geoLocation
            || geoLocation.lookupStatus !== "success"
        ) {
            return true;
        }

        if (
            String(session.ipAddress || "")
            !== normalizedIp
        ) {
            return true;
        }

        if (
            !geoLocation.country
            && !geoLocation.region
            && !geoLocation.city
            && !geoLocation.timezone
        ) {
            return true;
        }

        const updatedAt =
            new Date(
                geoLocation.updatedAt || 0
            )
            .getTime();

        return (
            !Number.isFinite(updatedAt)
            || Date.now() - updatedAt
                >= this.config.cacheTtlMs
        );
    }


    buildUrl(ipAddress) {
        const url =
            new URL(
                `${this.config.endpoint}/${encodeURIComponent(ipAddress)}`
            );

        url.searchParams.set(
            "fields",
            [
                "success",
                "message",
                "country",
                "country_code",
                "region",
                "region_code",
                "city",
                "timezone"
            ]
            .join(",")
        );

        if (this.config.language) {
            url.searchParams.set(
                "lang",
                this.config.language
            );
        }

        return url.toString();
    }


    async performLookup(ipAddress) {
        try {
            const payload =
                await this.requestJson(
                    this.buildUrl(ipAddress),
                    this.config.timeoutMs
                );

            if (
                !payload
                || payload.success !== true
            ) {
                throw new Error(
                    cleanText(
                        payload && payload.message,
                        200
                    )
                    || "IP geolocation lookup failed."
                );
            }

            const value = {
                success: true,
                ...normalizeLookupResponse(
                    ipAddress,
                    payload,
                    this.config.provider
                )
            };

            this.setCached(
                ipAddress,
                value,
                this.config.cacheTtlMs
            );

            return value;
        }
        catch (error) {
            const value = {
                success: false,
                ipAddress,
                lookupStatus: "failed",
                message:
                    cleanText(
                        error && error.message,
                        240
                    )
                    || "IP geolocation lookup failed."
            };

            this.setCached(
                ipAddress,
                value,
                this.config.negativeCacheTtlMs
            );

            return value;
        }
    }


    async lookup(value) {
        const ipAddress =
            normalizeIp(value);

        if (!this.config.enabled) {
            return {
                success: false,
                skipped: true,
                ipAddress,
                lookupStatus: "disabled"
            };
        }

        if (!isPublicIp(ipAddress)) {
            return {
                success: false,
                skipped: true,
                ipAddress,
                lookupStatus: "private_or_invalid"
            };
        }

        const cached =
            this.getCached(ipAddress);

        if (cached) {
            return cached;
        }

        if (this.inFlight.has(ipAddress)) {
            return await this.inFlight.get(ipAddress);
        }

        const promise =
            this.performLookup(ipAddress)
            .finally(() => {
                this.inFlight.delete(ipAddress);
            });

        this.inFlight.set(
            ipAddress,
            promise
        );

        return await promise;
    }


    clearCache() {
        this.cache.clear();
        this.inFlight.clear();
    }
}


const service =
new IpGeolocationService();

module.exports = service;
module.exports.IpGeolocationService =
IpGeolocationService;
module.exports.isPublicIp =
isPublicIp;
module.exports.normalizeLookupResponse =
normalizeLookupResponse;
