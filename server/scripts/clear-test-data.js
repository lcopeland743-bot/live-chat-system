/**
 * Clear local Meridian test data safely.
 *
 * Does NOT delete the admin_sessions collection.
 */

require("dotenv").config();


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


const {
    connectDatabase,
    disconnectDatabase
}
=
require("../database/connection");


const REQUIRED_CONFIRMATION =
"CLEAR_LOCAL_TEST_DATA";


function assertAllowed() {
    const confirmationIndex =
        process.argv.indexOf(
            "--confirm"
        );

    const confirmation =
        confirmationIndex >= 0
        ? process.argv[
            confirmationIndex + 1
        ]
        : "";

    if (confirmation !== REQUIRED_CONFIRMATION) {
        throw new Error(
            "Missing confirmation token"
        );
    }

    if (
        process.env.NODE_ENV === "production"
    ) {
        throw new Error(
            "Refusing to clear test data while NODE_ENV=production"
        );
    }
}


async function clearUploads() {
    const directory =
        path.resolve(
            __dirname,
            "..",
            "uploads"
        );

    let entries;

    try {
        entries =
            await fs.readdir(
                directory,
                {
                    withFileTypes: true
                }
            );
    }
    catch (error) {
        if (error.code === "ENOENT") {
            return 0;
        }

        throw error;
    }

    let deleted =
        0;

    for (const entry of entries) {
        if (
            !entry.isFile()
            || entry.name === ".gitkeep"
        ) {
            continue;
        }

        await fs.unlink(
            path.join(
                directory,
                entry.name
            )
        );

        deleted += 1;
    }

    return deleted;
}


async function main() {
    assertAllowed();

    await connectDatabase();

    const countsBefore = {
        messages:
            await Message.countDocuments(),
        sessions:
            await Session.countDocuments(),
        conversionEvents:
            await ConversionEvent
            .countDocuments()
    };

    const [
        messageResult,
        sessionResult,
        eventResult,
        uploadsDeleted
    ] =
    await Promise.all([
        Message.deleteMany({}),
        Session.deleteMany({}),
        ConversionEvent.deleteMany({}),
        clearUploads()
    ]);

    console.log(
        "Local test data cleared"
    );

    console.log({
        before:
            countsBefore,
        deleted: {
            messages:
                messageResult.deletedCount
                || 0,
            sessions:
                sessionResult.deletedCount
                || 0,
            conversionEvents:
                eventResult.deletedCount
                || 0,
            uploads:
                uploadsDeleted
        },
        preserved:
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
            "Test data clear failed:",
            error.message
        );

        await disconnectDatabase();

        process.exit(1);
    }
);
