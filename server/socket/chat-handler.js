/**
 * Meridian Chat Handler
 *
 * Version:
 * v2.0.2
 *
 * Features:
 * - Rich Message Support
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









function normalizeContent(data){



    return (

        data.content

        ||

        data.message

        ||

        ""

    );



}









function normalizeType(data){



    return (

        data.type

        ||

        "text"

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




                /**
                 * 兼容旧版本
                 */
                message:

                normalizeContent(data),




                /**
                 * v2.0.2
                 */
                content:

                normalizeContent(data),




                type:

                normalizeType(data),




                metadata:

                data.metadata

                ||

                {},




                messageStatus:

                "sent",




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
             * 更新Session
             */
            await sessionService.updateMessage(

                payload.userId,

                payload.content

            );








            /**
             * 未读数量
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
             * 推送后台消息
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

                !(

                    data.message

                    ||

                    data.content

                )

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

                normalizeContent(data),




                content:

                normalizeContent(data),




                type:

                normalizeType(data),




                metadata:

                data.metadata

                ||

                {},




                messageStatus:

                "sent",




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

                payload.content

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
             * 推送用户端
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