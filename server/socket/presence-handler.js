/**
 * Meridian Presence Handler
 *
 * Unified visitor presence, persistent session metadata,
 * and multi-tab-safe Socket lifecycle handling.
 *
 * Version: v2.4.2
 */

const presenceService =
require("../services/presence-service");

const sessionService =
require("../services/session-service");

const ipGeolocationService =
require("../services/ip-geolocation-service");

const MeridianTime =
require("../utils/time");

const {
    getSocketClientIp,
    getSocketUserAgent
}
=
require("../utils/client-ip");

const {
    ADMIN_ROOM
}
=
require("../middleware/admin-socket-auth");

const {
    resolveAnalysisLandingContext
}
=
require("../config/analysis-campaign-registry");


function emitSessionUpdate(io, session) {
    if (!session) {
        return;
    }

    io.to(ADMIN_ROOM)
    .emit(
        "admin_session_update",
        {
            type: "update",
            session
        }
    );
}


async function enrichSessionLocation(
    io,
    session,
    ipAddress
) {
    if (
        !session
        || !ipGeolocationService
            .shouldRefresh(
                session,
                ipAddress
            )
    ) {
        return;
    }

    const result =
        await ipGeolocationService
        .lookup(ipAddress);

    if (!result.success) {
        if (!result.skipped) {
            console.warn(
                "[IP Geolocation] Lookup failed:",
                {
                    ipAddress,
                    message: result.message
                }
            );
        }

        return;
    }

    const updatedSession =
        await sessionService
        .updateGeoLocation(
            session.userId,
            ipAddress,
            result
        );

    if (!updatedSession) {
        return;
    }

    presenceService.updateGeoLocation(
        session.userId,
        updatedSession.geoLocation
    );

    console.log(
        "[IP Geolocation] Resolved:",
        {
            userId: session.userId,
            ipAddress,
            location:
                result.locationLabel,
            timezone:
                result.timezone
        }
    );

    emitSessionUpdate(
        io,
        updatedSession
    );
}


function registerPresenceHandler(
    io,
    socket
) {
    socket.on(
        "user_online",
        async data => {
            try {
                if (
                    !data
                    || !data.userId
                ) {
                    return;
                }

                const time =
                    MeridianTime.now();

                const ipAddress =
                    getSocketClientIp(socket);

                const userAgent =
                    getSocketUserAgent(socket);

                const hadActiveConnection =
                    presenceService.hasUser(
                        data.userId
                    );

                const landingContext =
                    resolveAnalysisLandingContext(
                        data.landingContext
                    );

                socket.data.userId =
                    data.userId;

                socket.data.conversationId =
                    data.conversationId || "";

                socket.data.landingContext =
                    landingContext;

                const user =
                    presenceService.addUser({
                        userId:
                            data.userId,
                        socketId:
                            socket.id,
                        page:
                            data.page,
                        landingContext:
                            landingContext,
                        ipAddress,
                        userAgent,
                        connectedAt:
                            time
                    });

                const session =
                    await sessionService
                    .createSession({
                        userId:
                            data.userId,
                        socketId:
                            socket.id,
                        conversationId:
                            data.conversationId,
                        allowConversationReset:
                            !hadActiveConnection,
                        page:
                            data.page,
                        landingContext,
                        ipAddress,
                        userAgent,
                        time
                    });

                console.log(
                    "[Presence] Online:",
                    {
                        userId:
                            user.userId,
                        socketCount:
                            user.socketCount,
                        ipAddress:
                            user.ipAddress,
                        conversationId:
                            session
                            ? session.conversationId
                            : null
                    }
                );

                emitSessionUpdate(
                    io,
                    session
                );

                enrichSessionLocation(
                    io,
                    session,
                    ipAddress
                )
                .catch(error => {
                    console.error(
                        "[IP Geolocation Error]",
                        error
                    );
                });
            }
            catch (error) {
                console.error(
                    "[Presence Online Error]",
                    error
                );
            }
        }
    );


    socket.on(
        "user_offline",
        () => {
            handleOffline()
            .catch(error => {
                console.error(
                    "[Presence Offline Error]",
                    error
                );
            });
        }
    );


    socket.on(
        "disconnect",
        () => {
            handleOffline()
            .catch(error => {
                console.error(
                    "[Presence Disconnect Error]",
                    error
                );
            });
        }
    );


    async function handleOffline() {
        const time =
            MeridianTime.now();

        const result =
            presenceService
            .removeUserBySocket(
                socket.id
            );

        if (
            !result
            || !result.user
        ) {
            return;
        }

        let session;

        if (result.isOffline) {
            session =
                await sessionService.offline(
                    result.user.userId,
                    time
                );

            console.log(
                "[Presence] Offline:",
                {
                    userId:
                        result.user.userId,
                    ipAddress:
                        result.user.ipAddress
                }
            );
        }
        else {
            session =
                await sessionService
                .setActiveSocket(
                    result.user.userId,
                    result.activeSocketId,
                    time
                );

            console.log(
                "[Presence] Socket detached; visitor remains online:",
                {
                    userId:
                        result.user.userId,
                    socketCount:
                        result.user.socketCount
                }
            );
        }

        emitSessionUpdate(
            io,
            session
        );
    }
}


module.exports =
registerPresenceHandler;
