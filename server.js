const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");


const config =
require("./server/config/server-config");


const MeridianTime =
require("./server/utils/time");



const registerChatHandler =
require("./server/socket/chat-handler");


const registerPresenceHandler =
require("./server/socket/presence-handler");



const app = express();


const server =
http.createServer(app);



const io =
new Server(server);



app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
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



app.get(
    "/admin",
    (req,res)=>{


        res.sendFile(
            path.join(
                __dirname,
                "public",
                "admin.html"
            )
        );


    }
);





io.on(
    "connection",
    (socket)=>{


        console.log(
            "Socket connected:",
            socket.id
        );



        /**
         * 注册聊天模块
         */
        registerChatHandler(
            io,
            socket
        );



        /**
         * 注册在线状态模块
         */
        registerPresenceHandler(
            io,
            socket
        );





        /**
         * 用户进入记录
         *
         * 暂时保留
         */
        socket.on(
            "user_enter",
            (data)=>{


                const payload = {


                    socketId:
                    socket.id,


                    userId:
                    data.userId,


                    page:
                    data.page,


                    referrer:
                    data.referrer,


                    time:
                    data.time
                    ||
                    MeridianTime.now()


                };



                console.log(
                    "User entered:",
                    payload
                );



                io.emit(
                    "admin_user_enter",
                    payload
                );


            }
        );



    }
);





server.listen(
    config.port,
    ()=>{


        console.log(
            `${config.appName} running on port ${config.port}`
        );


    }
);