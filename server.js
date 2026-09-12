/**
 * Meridian Chat SDK Server
 *
 * Version:
 * v2.4.2
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
 * - Five-Reply AI Resource Limit
 * - Customer Language Lock
 * - Mandatory Fifth-Reply WhatsApp Close
 * - Structured Output Auto-Retry and Safe Fallback
 * - Admin Visitor Classification Statistics
 * - Direct Answer Framework 1.2
 * - 200-Character AI Reply Limit
 * - Customer AI Typing Indicator
 * - Latest-Only Auto Reply Concurrency Control
 * - Persistent Error Monitoring and Admin Diagnostics
 * - Offline Silent Session Automatic Cleanup
 * - Admin Search, Filters, Labels, and Lead Intent
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


const errorMonitorService =
require("./server/services/error-monitor-service");


const {
    requestIdMiddleware,
    expressErrorHandler,
    installProcessHandlers
}
=
require("./server/middleware/error-monitor-middleware");


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


const adminErrorRoute =
require("./server/routes/admin-error-route");


const adminFunnelRoute =
require("./server/routes/admin-funnel-route");


const messageRoute =
require("./server/routes/message-route");


const sessionRoute =
require("./server/routes/session-route");


const adminStateRoute =
require("./server/routes/admin-state-route");


const adminSessionRoute =
require("./server/routes/admin-session-route");


const agentRoute =
require("./server/routes/agent-route");


const sessionAgentRoute =
require("./server/routes/session-agent-route");


const uploadRoute =
require("./server/routes/upload-route");


const conversionRoute =
require("./server/routes/conversion-route");


const adminWhatsappSettingsRoute =
require("./server/routes/admin-whatsapp-settings-route");


const whatsappRedirectRoute =
require("./server/routes/whatsapp-redirect-route");


const analysisEntryRoute =
require("./server/routes/analysis-entry-route");


installProcessHandlers();


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

    requestIdMiddleware

);


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

    "/",

    whatsappRedirectRoute

);


app.use(

    "/",

    analysisEntryRoute

);


app.get(

    /^\/lp\/004-when-machines-become-work\/?$/,

    (req,res)=>{

        const campaignPath =
        "/lp/004-when-machines-become-work";

        if(

            req.path
            ===
            campaignPath

        ){

            const queryStart =
            req.originalUrl.indexOf(

                "?"

            );

            const queryString =
            queryStart
            ===
            -1
            ?
            ""
            :
            req.originalUrl.slice(

                queryStart

            );

            return res.redirect(

                308,

                `${campaignPath}/${queryString}`

            );

        }

        return res.sendFile(

            path.join(

                __dirname,

                "public",

                "lp",

                "004-when-machines-become-work",

                "index.html"

            )

        );

    }

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

    "/api/admin/sessions",

    adminSessionRoute

);


app.use(

    "/api/admin/ai",

    adminAiRoute

);


app.use(

    "/api/admin/errors",

    adminErrorRoute

);


app.use(

    "/api/admin/funnel",

    adminFunnelRoute

);


app.use(

    "/api/admin/whatsapp-settings",

    adminWhatsappSettingsRoute

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


app.use(

    expressErrorHandler

);


io.engine.use(

    sessionMiddleware

);


configureAdminSocketAuth(

    io

);


io.engine.on(

    "connection_error",

    error=>{


        console.error(

            "[Socket Connection Error]",

            error

        );


        errorMonitorService

        .captureError({

            source:

                "socket.connection",

            error,

            message:

                "Socket connection failed.",

            code:

                error.code

                || "SOCKET_CONNECTION_FAILED",

            context: {

                remoteAddress:

                    error.req

                    && error.req.socket

                    ? error.req.socket.remoteAddress

                    : null

            }

        })

        .catch(()=>{});


    }

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


        socket.on(

            "error",

            error=>{


                console.error(

                    "[Socket Error]",

                    error

                );


                errorMonitorService

                .captureError({

                    source:

                        "socket.runtime",

                    error,

                    message:

                        "Socket runtime error.",

                    code:

                        error.code

                        || "SOCKET_RUNTIME_FAILED",

                    context: {

                        socketId:

                            socket.id,

                        isAdmin:

                            socket.data.isAdmin

                            === true

                    }

                })

                .catch(()=>{});


            }

        );


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


    await errorMonitorService

    .flushBuffer();


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


            errorMonitorService

            .captureError({

                source:

                    "startup.data_retention",

                error,

                message:

                    "Data retention startup initialization failed.",

                code:

                    error.code

                    || "DATA_RETENTION_STARTUP_FAILED"

            })

            .catch(()=>{});


        }

    );


    server.listen(

        config.port,

        ()=>{


            console.log(

                "Meridian Chat SDK v2.4.2 running on port",

                config.port

            );


        }

    );


}


startServer()

.catch(

    async error=>{


        console.error(

            "Server startup failed:",

            error

        );


        await errorMonitorService

        .captureCritical({

            source:

                "startup.server",

            error,

            message:

                "Server startup failed.",

            code:

                error.code

                || "SERVER_STARTUP_FAILED"

        })

        .catch(()=>null);


        process.exit(1);


    }

);
