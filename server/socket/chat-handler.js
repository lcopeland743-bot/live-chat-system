/**
 * Meridian Chat Handler
 *
 * Version:
 * v1.2.1
 *
 * Features:
 * - Message ID
 * - Deduplication
 * - MongoDB Message Storage
 * - MongoDB Session Update
 * - Unread Message Counter
 */



const MeridianTime =
require("../utils/time");



const messageService =
require("../services/message-service");



const sessionService =
require("../services/session-service");







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

        async(data)=>{



            const payload = {



                messageId:

                data.messageId

                ||

                createMessageId(),




                userId:

                data.userId,




                sessionId:

                data.userId,




                socketId:

                socket.id,




                message:

                data.message,




                type:

                "text",




                time:

                data.time

                ||

                MeridianTime.now()

            };







            if(

                messageService.isDuplicate(

                    payload.messageId

                )

            ){

                return;

            }







            /**
             * 保存用户消息
             */
            await messageService.saveMessage({



                ...payload,


                sender:

                "user"


            });








            /**
             * 更新Session消息信息
             */
            await sessionService.updateMessage(

                payload.userId,

                payload.message

            );








            /**
             * 增加未读数量
             *
             * Phase 1.5
             */
            const session =

            await sessionService.incrementUnread(

                payload.userId

            );








            console.log(

                "[Message Saved]",

                payload

            );








            /**
             * 更新后台Session
             */
            io.emit(

                "admin_session_update",

                {


                    type:

                    "update",



                    session:

                    session



                }

            );









            /**
             * 推送后台
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

        async(data)=>{





            if(

                !data.socketId

                ||

                !data.message

            ){

                return;

            }







            const sessions =

            await sessionService.getSessions();






            const session =

            sessions.find(

                item =>

                item.socketId === data.socketId

            );






            if(!session){

                return;

            }








            const payload = {



                messageId:

                createMessageId(),




                userId:

                session.userId,




                sessionId:

                session.userId,




                socketId:

                data.socketId,




                message:

                data.message,




                type:

                "text",




                time:

                data.time

                ||

                MeridianTime.now()



            };








            if(

                messageService.isDuplicate(

                    payload.messageId

                )

            ){

                return;

            }








            /**
             * 保存客服消息
             */
            await messageService.saveMessage({



                ...payload,


                sender:

                "admin"


            });








            /**
             * 更新Session
             */
            const updatedSession =

            await sessionService.updateMessage(

                session.userId,

                payload.message

            );









            io.emit(

                "admin_session_update",

                {


                    type:

                    "update",



                    session:

                    updatedSession



                }

            );








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
             * 同步后台窗口
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