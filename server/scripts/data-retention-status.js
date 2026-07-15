/**
 * Display Meridian data retention status.
 */

require("dotenv").config();


const Message =
require("../database/models/message-model");


const Session =
require("../database/models/session-model");


const ConversionEvent =
require("../database/models/conversion-event-model");


const config =
require("../config/data-retention-config");


const {
    connectDatabase,
    disconnectDatabase
}
=
require("../database/connection");


async function main() {
    await connectDatabase();

    const now =
        new Date();

    const [
        messages,
        sessions,
        closedSessions,
        conversionEvents,
        expiredMessages,
        expiredEvents,
        expiredSessions
    ] =
    await Promise.all([
        Message.countDocuments(),
        Session.countDocuments(),
        Session.countDocuments({
            conversationStatus:
                "closed"
        }),
        ConversionEvent.countDocuments(),
        Message.countDocuments({
            expiresAt: {
                $lte: now
            }
        }),
        ConversionEvent.countDocuments({
            expiresAt: {
                $lte: now
            }
        }),
        Session.countDocuments({
            conversationStatus:
                "closed",
            purgeAt: {
                $lte: now
            }
        })
    ]);

    console.log({
        config: {
            enabled:
                config.enabled,
            messageRetentionDays:
                config.messageRetentionDays,
            closedSessionRetentionDays:
                config.closedSessionRetentionDays,
            conversionEventRetentionDays:
                config.conversionEventRetentionDays,
            uploadRetentionDays:
                config.uploadRetentionDays,
            runIntervalHours:
                config.runIntervalHours,
            batchSize:
                config.batchSize
        },
        counts: {
            messages,
            sessions,
            closedSessions,
            conversionEvents
        },
        readyForDeletion: {
            messages:
                expiredMessages,
            conversionEvents:
                expiredEvents,
            closedSessions:
                expiredSessions
        },
        protectedCollection:
            "admin_sessions"
    });
}


main()
.then(
    async() => {
        await disconnectDatabase();
    }
)
.catch(
    async error => {
        console.error(
            "Retention status failed:",
            error
        );

        await disconnectDatabase();

        process.exit(1);
    }
);
