/**
 * Meridian Data Retention Service
 *
 * Version:
 * v2.3.2
 *
 * Responsibilities:
 * - Ensure TTL indexes
 * - Backfill expiry dates for existing records
 * - Delete expired messages/events/closed sessions deterministically
 * - Delete old uploaded files
 * - Run on startup and on a fixed interval
 */

const fs =
require("fs/promises");


const path =
require("path");


const Message =
require("../database/models/message-model");


const Session =
require("../database/models/session-model");


const ConversionEvent =
require("../database/models/conversion-event-model");


const config =
require("../config/data-retention-config");


let timer =
null;


let running =
false;


function getMissingDateFilter(fieldName) {
    return {
        $or: [
            {
                [fieldName]: {
                    $exists: false
                }
            },
            {
                [fieldName]: null
            }
        ]
    };
}


async function ensureIndexes() {
    await Promise.all([
        Message.createIndexes(),
        Session.createIndexes(),
        ConversionEvent.createIndexes()
    ]);
}


async function backfillExpiryDates(
    Model,
    fieldName,
    sourceDateField,
    calculateExpiry
) {
    let updated =
        0;

    while (true) {
        const documents =
            await Model.find(
                getMissingDateFilter(fieldName)
            )
            .select({
                _id: 1,
                [sourceDateField]: 1,
                createdAt: 1,
                updatedAt: 1
            })
            .limit(config.batchSize)
            .lean();

        if (documents.length === 0) {
            break;
        }

        const operations =
            documents
            .map(document => {
                const sourceDate =
                    document[sourceDateField]
                    || document.createdAt
                    || document.updatedAt
                    || new Date();

                const expiry =
                    calculateExpiry(sourceDate);

                if (!expiry) {
                    return null;
                }

                return {
                    updateOne: {
                        filter: {
                            _id: document._id,
                            ...getMissingDateFilter(
                                fieldName
                            )
                        },
                        update: {
                            $set: {
                                [fieldName]:
                                    expiry
                            }
                        }
                    }
                };
            })
            .filter(Boolean);

        if (operations.length === 0) {
            break;
        }

        const result =
            await Model.bulkWrite(
                operations,
                {
                    ordered: false
                }
            );

        updated +=
            result.modifiedCount || 0;

        if (documents.length < config.batchSize) {
            break;
        }
    }

    return updated;
}


async function backfillClosedSessionPurgeDates() {
    let updated =
        0;

    while (true) {
        const sessions =
            await Session.find({
                conversationStatus:
                    "closed",
                ...getMissingDateFilter(
                    "purgeAt"
                )
            })
            .select({
                _id: 1,
                updatedAt: 1,
                createdAt: 1
            })
            .limit(config.batchSize)
            .lean();

        if (sessions.length === 0) {
            break;
        }

        const operations =
            sessions.map(session => {
                const closedAt =
                    session.updatedAt
                    || session.createdAt
                    || new Date();

                return {
                    updateOne: {
                        filter: {
                            _id:
                                session._id,
                            conversationStatus:
                                "closed",
                            ...getMissingDateFilter(
                                "purgeAt"
                            )
                        },
                        update: {
                            $set: {
                                purgeAt:
                                    config
                                    .calculateClosedSessionPurgeAt(
                                        closedAt
                                    )
                            }
                        }
                    }
                };
            });

        const result =
            await Session.bulkWrite(
                operations,
                {
                    ordered: false
                }
            );

        updated +=
            result.modifiedCount || 0;

        if (sessions.length < config.batchSize) {
            break;
        }
    }

    return updated;
}


async function cleanupUploads(now = new Date()) {
    const uploadsDirectory =
        path.resolve(
            __dirname,
            "..",
            "uploads"
        );

    const cutoff =
        config.calculateUploadCutoff(now);

    if (!cutoff) {
        return {
            scanned: 0,
            deleted: 0
        };
    }

    let entries;

    try {
        entries =
            await fs.readdir(
                uploadsDirectory,
                {
                    withFileTypes: true
                }
            );
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return {
                scanned: 0,
                deleted: 0
            };
        }

        throw error;
    }

    let scanned =
        0;

    let deleted =
        0;

    for (const entry of entries) {
        if (
            !entry.isFile()
            || entry.name === ".gitkeep"
        ) {
            continue;
        }

        scanned += 1;

        const filePath =
            path.join(
                uploadsDirectory,
                entry.name
            );

        try {
            const stat =
                await fs.stat(filePath);

            if (stat.mtime < cutoff) {
                await fs.unlink(filePath);
                deleted += 1;
            }
        }
        catch (error) {
            if (error.code !== "ENOENT") {
                console.warn(
                    "[Data Retention] Upload cleanup skipped:",
                    entry.name,
                    error.message
                );
            }
        }
    }

    return {
        scanned,
        deleted
    };
}


async function runCleanup() {
    if (!config.enabled) {
        return {
            enabled: false
        };
    }

    if (running) {
        return {
            enabled: true,
            skipped: true,
            reason:
                "cleanup_already_running"
        };
    }

    running =
        true;

    const startedAt =
        new Date();

    try {
        const messageBackfilled =
            await backfillExpiryDates(
                Message,
                "expiresAt",
                "createdAt",
                date => {
                    return config
                    .calculateMessageExpiry(date);
                }
            );

        const eventBackfilled =
            await backfillExpiryDates(
                ConversionEvent,
                "expiresAt",
                "createdAt",
                date => {
                    return config
                    .calculateConversionEventExpiry(
                        date
                    );
                }
            );

        const closedSessionsBackfilled =
            await backfillClosedSessionPurgeDates();

        const now =
            new Date();

        const [
            messagesDeleted,
            eventsDeleted,
            sessionsDeleted,
            uploadResult
        ] =
        await Promise.all([
            Message.deleteMany({
                expiresAt: {
                    $lte: now
                }
            }),
            ConversionEvent.deleteMany({
                expiresAt: {
                    $lte: now
                }
            }),
            Session.deleteMany({
                conversationStatus:
                    "closed",
                purgeAt: {
                    $lte: now
                }
            }),
            cleanupUploads(now)
        ]);

        const result = {
            enabled: true,
            startedAt:
                startedAt.toISOString(),
            finishedAt:
                new Date().toISOString(),
            backfilled: {
                messages:
                    messageBackfilled,
                conversionEvents:
                    eventBackfilled,
                closedSessions:
                    closedSessionsBackfilled
            },
            deleted: {
                messages:
                    messagesDeleted.deletedCount
                    || 0,
                conversionEvents:
                    eventsDeleted.deletedCount
                    || 0,
                closedSessions:
                    sessionsDeleted.deletedCount
                    || 0,
                uploads:
                    uploadResult.deleted
            },
            uploadsScanned:
                uploadResult.scanned
        };

        console.log(
            "[Data Retention] Cleanup complete:",
            result
        );

        return result;
    }
    finally {
        running =
            false;
    }
}


function startScheduler() {
    if (
        !config.enabled
        || timer
    ) {
        return timer;
    }

    const intervalMs =
        config.runIntervalHours
        * 60
        * 60
        * 1000;

    timer =
        setInterval(
            () => {
                runCleanup()
                .catch(error => {
                    console.error(
                        "[Data Retention] Scheduled cleanup failed:",
                        error
                    );
                });
            },
            intervalMs
        );

    timer.unref();

    return timer;
}


async function initialize() {
    if (!config.enabled) {
        console.log(
            "[Data Retention] Disabled"
        );

        return {
            enabled: false
        };
    }

    await ensureIndexes();

    const result =
        await runCleanup();

    startScheduler();

    return result;
}


function stopScheduler() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}


module.exports = {
    ensureIndexes,
    runCleanup,
    initialize,
    startScheduler,
    stopScheduler,
    cleanupUploads
};
