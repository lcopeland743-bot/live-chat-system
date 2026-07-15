/**
 * Meridian Chat SDK Server
 *
 * Version:
 * v2.3.2
 *
 * Features:
 * - Express
 * - Socket.IO
 * - MongoDB
 * - Admin Session Authentication
 * - GPT-5.6 AI Customer Service
 * - OFF / ASSIST / AUTO AI Modes
 * - Human Takeover
 * - Conversation Conversion Engine
 * - OpenAI Web Search
 * - Protected Admin Pages and APIs
 * - Rich Messages and Uploads
 * - Data Retention and Automatic Cleanup
 */

require("dotenv").config();


const express =
require("express");


const http =
require("http");


const path =
require("path");


const {
    Server
}
=
require("socket.io");


const config =
require("./server/config/server-config");


const {
    connectDatabase
}
=
require("./server/database/connection");


const {
    createSessionMiddleware,
    isProduction
}
=
require("./server/config/session-config");


const adminAuthService =
require("./server/services/admin-auth-service");


const {
    requireAdminApi
}
=
require("./server/middleware/admin-auth-middleware");


const sessionCleanupService =
require("./server/services/session-cleanup-service");


const dataRetentionService =
require("./server/services/data-retention-service");


const registerPresenceHandler =
require("./server/socket/presence-handler");


const registerChatHandler =
require("./server/socket/chat-handler");


const {
    configureAdminSocketAuth,
    joinAuthenticatedAdminRoom
}
=
require("./server/middleware/admin-socket-auth");


const adminPageRoute =
require("./server/routes/admin-page-route");


const adminAuthRoute =
require("./server/routes/admin-auth-route");


const adminAiRoute =
require("./server/routes/admin-ai-route");


const messageRoute =
require("./server/routes/message-route");


const sessionRoute =
require("./server/routes/session-route");


const adminStateRoute =
require("./server/routes/admin-state-route");


const agentRoute =
require("./server/routes/agent-route");


const sessionAgentRoute =
require("./server/routes/session-agent-route");


const uploadRoute =
require("./server/routes/upload-route");


const conversionRoute =
require("./server/routes/conversion-route");


const app =
express();


if(isProduction()){


    app.set(

        "trust proxy",

        1

    );


}


app.disable(

    "x-powered-by"

);


const server =
http.createServer(app);


const io =
new Server(

    server,

    {


        cors:

        config.socket.cors


    }

);


app.set(

    "io",

    io

);


const sessionMiddleware =
createSessionMiddleware();


app.use(

    express.json({


        limit:

        "100kb"


    })

);


app.use(

    sessionMiddleware

);


app.use(

    "/api/admin/auth",

    adminAuthRoute

);


app.use(

    "/",

    adminPageRoute

);


app.use(

    express.static(

        path.join(

            __dirname,

            "public"

        ),

        {


            index:false


        }

    )

);


app.use(

    "/uploads",

    express.static(

        path.join(

            __dirname,

            "server",

            "uploads"

        )

    )

);


app.use(

    "/api/messages",

    messageRoute

);


app.use(

    "/api/sessions",

    requireAdminApi,

    sessionRoute

);


app.use(

    "/api/admin/state",

    adminStateRoute

);


app.use(

    "/api/admin/ai",

    adminAiRoute

);


app.use(

    "/api/agents",

    agentRoute

);


app.use(

    "/api/session-agent",

    sessionAgentRoute

);


app.use(

    "/api/upload",

    uploadRoute

);


app.use(

    "/api/conversion",

    conversionRoute

);


app.get(

    "/",

    (req,res)=>{


        res.sendFile(

            path.join(

                __dirname,

                "public",

                "index.html"

            )

        );


    }

);


io.engine.use(

    sessionMiddleware

);


configureAdminSocketAuth(

    io

);


io.on(

    "connection",

    socket=>{


        joinAuthenticatedAdminRoom(

            socket

        );


        console.log(

            socket.data.isAdmin

            ?

            "Admin socket connected:"

            :

            "User socket connected:",

            socket.id

        );


        if(

            socket.data.isAdmin !== true

        ){


            registerPresenceHandler(

                io,

                socket

            );


        }


        registerChatHandler(

            io,

            socket

        );


    }

);


async function startServer(){


    adminAuthService

    .assertConfigured();


    await connectDatabase();


    await sessionCleanupService

    .cleanupOnlineSessions();


    await dataRetentionService

    .initialize()

    .catch(

        error=>{


            console.error(

                "[Data Retention] Startup initialization failed:",

                error

            );


        }

    );


    server.listen(

        config.port,

        ()=>{


            console.log(

                "Meridian Chat SDK v2.3.2 running on port",

                config.port

            );


        }

    );


}


startServer()

.catch(

    error=>{


        console.error(

            "Server startup failed:",

            error

        );


        process.exit(1);


    }

);
