/**
 * Meridian Chat SDK Server
 *
 * Version:
 * v2.1.2
 *
 * Features:
 * - Express
 * - Socket.IO
 * - MongoDB
 * - Admin Session Authentication
 * - Protected Admin Pages and APIs
 * - Authenticated Admin Socket
 * - Unified Presence
 * - Chat
 * - Message History API
 * - Session Restore API
 * - Admin State Restore API
 * - Agent Management
 * - Session Agent Assignment
 * - Session Cleanup
 * - Image Upload
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


/**
 * Authentication API must be available before protected pages.
 */
app.use(

    "/api/admin/auth",

    adminAuthRoute

);


/**
 * Protected /admin and /admin.html routes must be registered
 * before public static files.
 */
app.use(

    "/",

    adminPageRoute

);


/**
 * Public static assets.
 * public/admin.html is only a redirect placeholder.
 */
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


/**
 * Uploaded files remain public because both visitors and admins
 * currently use the same upload endpoint.
 */
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


/**
 * Share the same Express session with Socket.IO.
 * Socket.IO 4.6+ supports Express middleware through Engine.IO.
 */
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


    server.listen(

        config.port,

        ()=>{


            console.log(

                "Meridian Chat SDK v2.1.2 running on port",

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
