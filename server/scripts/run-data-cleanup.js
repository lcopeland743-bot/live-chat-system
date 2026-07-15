/**
 * Run Meridian data retention cleanup immediately.
 */

require("dotenv").config();


const dataRetentionService =
require("../services/data-retention-service");


const {
    connectDatabase,
    disconnectDatabase
}
=
require("../database/connection");


async function main() {
    await connectDatabase();

    await dataRetentionService
    .ensureIndexes();

    const result =
        await dataRetentionService
        .runCleanup();

    console.log(
        JSON.stringify(
            result,
            null,
            2
        )
    );
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
            "Data cleanup failed:",
            error
        );

        await disconnectDatabase();

        process.exit(1);
    }
);
