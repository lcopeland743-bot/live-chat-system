/**
 * Meridian Chat Handler
 *
 * Socket 聊天事件处理
 *
 * Version: v1.1.0
 */


const MeridianTime =
require("../utils/time");



/**
 * 注册聊天事件
 *
 * @param io Socket.io Server
 * @param socket 当前连接
 */
function registerChatHandler(
    io,
    socket
){



    /**
     * 用户发送消息
     *
     * Client
     *    ↓
     * Server
     *    ↓
     * Admin
     */
    socket.on(
        "user_message",
        (data)=>{


            const payload = {


                socketId:
                socket.id,


                userId:
                data.userId,


                message:
                data.message,


                page:
                data.page,


                time:
                data.time
                ||
                MeridianTime.now()


            };



            console.log(
                "User message:",
                payload
            );



            io.emit(
                "admin_user_message",
                payload
            );


        }
    );





    /**
     * 客服回复
     *
     * Admin
     *    ↓
     * Server
     *    ↓
     * User
     */
    socket.on(
        "admin_reply",
        (data)=>{


            if(
                !data.socketId
                ||
                !data.message
            ){

                return;

            }



            const payload = {


                socketId:
                data.socketId,


                message:
                data.message,


                time:
                data.time
                ||
                MeridianTime.now()


            };



            console.log(
                "Admin reply:",
                payload
            );



            io.to(
                data.socketId
            )
            .emit(
                "admin_reply",
                payload
            );


        }
    );



}



module.exports =
registerChatHandler;