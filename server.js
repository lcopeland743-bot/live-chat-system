/**
 * Meridian Chat SDK Server
 *
 * Version:
 * v2.0.3
 *
 * Features:
 * - Express
 * - Socket.IO
 * - MongoDB
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



const express =
require("express");


const http =
require("http");


const path =
require("path");


const {Server} =
require("socket.io");





const config =
require("./server/config/server-config");





const {
    connectDatabase
}
=
require("./server/database/connection");





const sessionCleanupService =
require("./server/services/session-cleanup-service");





const registerPresenceHandler =
require("./server/socket/presence-handler");





const registerChatHandler =
require("./server/socket/chat-handler");







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



/**
 * Image Upload Route
 */
const uploadRoute =
require("./server/routes/upload-route");








const app =
express();





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









app.use(

    express.json()

);









/**
 * Public Static
 */
app.use(

    express.static(

        path.join(

            __dirname,

            "public"

        )

    )

);









/**
 * Uploaded Files Access
 *
 * /uploads/xxx.png
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









/**
 * Message History API
 */
app.use(

    "/api/messages",

    messageRoute

);









/**
 * Session Restore API
 */
app.use(

    "/api/sessions",

    sessionRoute

);









/**
 * Admin State Restore API
 */
app.use(

    "/api/admin/state",

    adminStateRoute

);









/**
 * Agent Management API
 */
app.use(

    "/api/agents",

    agentRoute

);









/**
 * Session Agent Assignment API
 */
app.use(

    "/api/session-agent",

    sessionAgentRoute

);









/**
 * Image Upload API
 */
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

                "public/index.html"

            )

        );


    }

);









app.get(

    "/admin",

    (req,res)=>{


        res.sendFile(

            path.join(

                __dirname,

                "public/admin.html"

            )

        );


    }

);









/**
 * Socket.IO
 *
 * 保持原架构
 */
io.on(

    "connection",

    (socket)=>{



        console.log(

            "Socket connected:",

            socket.id

        );








        registerPresenceHandler(

            io,

            socket

        );








        registerChatHandler(

            io,

            socket

        );



    }

);









async function startServer(){



    await connectDatabase();







    await sessionCleanupService

    .cleanupOnlineSessions();







    server.listen(

        config.port,

        ()=>{


            console.log(

                "Meridian Chat SDK running on port",

                config.port

            );


        }

    );


}









startServer();