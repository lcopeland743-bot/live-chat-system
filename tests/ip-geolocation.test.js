"use strict";

const assert =
require("assert");

const fs =
require("fs");

const path =
require("path");

const {
    IpGeolocationService,
    isPublicIp,
    normalizeLookupResponse
}
=
require(
    "../server/services/ip-geolocation-service"
);


async function run() {
    assert.strictEqual(
        isPublicIp("8.8.8.8"),
        true,
        "Public IPv4 should be resolved."
    );

    assert.strictEqual(
        isPublicIp("192.168.1.10"),
        false,
        "Private IPv4 must not be sent to the provider."
    );

    assert.strictEqual(
        isPublicIp("127.0.0.1"),
        false,
        "Loopback IPv4 must not be sent to the provider."
    );

    assert.strictEqual(
        isPublicIp("2001:4860:4860::8888"),
        true,
        "Public IPv6 should be resolved."
    );

    assert.strictEqual(
        isPublicIp("::1"),
        false,
        "Loopback IPv6 must not be sent to the provider."
    );

    const normalized =
        normalizeLookupResponse(
            "8.8.8.8",
            {
                country: "美国",
                country_code: "US",
                region: "加利福尼亚州",
                region_code: "CA",
                city: "山景城",
                timezone: {
                    id: "America/Los_Angeles",
                    abbr: "PDT"
                }
            }
        );

    assert.strictEqual(
        normalized.locationLabel,
        "美国 · 加利福尼亚州 · 山景城"
    );
    assert.strictEqual(
        normalized.timezone,
        "America/Los_Angeles"
    );

    let requestCount = 0;

    const service =
        new IpGeolocationService({
            config: {
                enabled: true,
                endpoint: "https://example.test",
                language: "zh-CN",
                timeoutMs: 1000,
                cacheTtlMs: 60000,
                negativeCacheTtlMs: 1000,
                provider: "test-provider"
            },
            requestJson: async url => {
                requestCount += 1;

                assert.ok(
                    url.includes("8.8.4.4"),
                    "Lookup URL must contain the target IP."
                );

                return {
                    success: true,
                    country: "美国",
                    country_code: "US",
                    region: "加利福尼亚州",
                    region_code: "CA",
                    city: "山景城",
                    timezone: {
                        id: "America/Los_Angeles",
                        abbr: "PDT"
                    }
                };
            }
        });

    const first =
        await service.lookup("8.8.4.4");

    const second =
        await service.lookup("8.8.4.4");

    assert.strictEqual(first.success, true);
    assert.strictEqual(second.success, true);
    assert.strictEqual(
        requestCount,
        1,
        "A repeated IP lookup must use the in-memory cache."
    );

    const privateResult =
        await service.lookup("10.0.0.2");

    assert.strictEqual(
        privateResult.skipped,
        true,
        "Private IP lookup must be skipped."
    );
    assert.strictEqual(requestCount, 1);

    assert.strictEqual(
        service.shouldRefresh(
            {
                ipAddress: "8.8.4.4",
                geoLocation: {
                    lookupStatus: "success",
                    country: "美国",
                    timezone: "America/Los_Angeles",
                    updatedAt: new Date()
                }
            },
            "8.8.4.4"
        ),
        false,
        "Fresh MongoDB geolocation should prevent another provider call."
    );

    const root =
        path.resolve(__dirname, "..");

    const adminHtml =
        fs.readFileSync(
            path.join(
                root,
                "server/views/admin.html"
            ),
            "utf8"
        );

    const adminUi =
        fs.readFileSync(
            path.join(
                root,
                "public/js/admin/admin-ui.js"
            ),
            "utf8"
        );

    const adminLeads =
        fs.readFileSync(
            path.join(
                root,
                "public/js/admin/admin-leads.js"
            ),
            "utf8"
        );

    assert.ok(
        adminHtml.includes("adminLeadLocation")
        && adminHtml.includes("adminLeadLocalTime"),
        "Admin detail panel must contain location and local-time fields."
    );

    assert.ok(
        adminUi.includes("formatVisitorLocation")
        && adminUi.includes("formatVisitorLocalTime"),
        "Admin UI must format approximate location and local time."
    );

    assert.ok(
        adminLeads.includes("refreshCurrentLocalTime"),
        "Admin lead detail must refresh customer local time."
    );

    console.log(
        "IP Geolocation + Admin Local Time v2.4.2 tests passed."
    );
}


run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
