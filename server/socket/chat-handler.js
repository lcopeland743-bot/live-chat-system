/**
 * Meridian Chat Handler
 *
 * Socket 聊天事件处理
 *
 * Version: v1.1.0
 *
 * Features:
 * - Message Timestamp
 * - Message ID
 * - Duplicate prevention foundation
 */


const MeridianTime =
require("../utils/time");


console.log(
    "CHAT HANDLER VERSION: messageId enabled"
);





/**
 * 生成消息ID
 */
function createMessageId(){


    return (

        "msg_" +

        Date.now()

        +

        "_"

        +

        Math.random()
        .toString(36)
        .substring(2,8)

    );


}





function registerChatHandler(
    io,
    socket
){



    /**
     * 用户发送消息
     */
    socket.on(
        "user_message",
        (data)=>{


            const payload = {


                messageId:
                createMessageId(),


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



            /**
             * 发送给后台
             */
            io.emit(
                "admin_user_message",
                payload
            );


        }
    );







    /**
     * 客服回复
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


                messageId:
                createMessageId(),



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





            /**
             * 发送给用户
             */
            io.to(
                data.socketId
            )
            .emit(
                "admin_reply",
                payload
            );





            /**
             * 当前客服窗口回显
             */
            socket.emit(
                "admin_reply",
                payload
            );



        }
    );



}





module.exports =
registerChatHandler;