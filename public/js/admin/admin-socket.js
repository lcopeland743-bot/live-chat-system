/**
 * Meridian Admin Socket
 *
 * 多会话消息管理
 *
 * Version:
 * v2.1.2
 *
 * Features:
 * - Admin State Restore
 * - Session Restore
 * - Online Offline Restore
 * - History Restore Trigger
 * - Conversation Store
 * - Message Isolation
 * - MessageId Complete Support
 * - Rich Message Sync
 */



window.MeridianAdminSocket = {



    socket:null,









    async loadAdminState(){



        try{



            const response =

            await fetch(

                "/api/admin/state",

                {


                    credentials:

                    "same-origin",


                    cache:

                    "no-store"


                }

            );





            if(

                window.MeridianAdminAuth

                &&

                window.MeridianAdminAuth

                .handleUnauthorizedResponse(

                    response

                )

            ){


                return;


            }


            const result =

            await response.json();





            if(

                !result.success

            ){

                return;

            }







            result.sessions.forEach(

                session=>{


                    MeridianAdminState.updateSession(

                        session

                    );


                }

            );







            MeridianAdminState.onlineUsers =

            result.onlineUsers || [];







            MeridianAdminState.offlineUsers =

            result.offlineUsers || [];







            MeridianAdminUI.renderSessions();

            if(
    MeridianAdminUI.renderOnlineUsers
){

    MeridianAdminUI.renderOnlineUsers();

}









            setTimeout(

                ()=>{


                    if(

                        MeridianAdminUI.restoreCurrentSession

                    ){

                        MeridianAdminUI.restoreCurrentSession();

                    }


                },


                300

            );







            console.log(

                "Admin state restored:",

                result

            );



        }

        catch(error){



            console.error(

                "Admin state restore failed:",

                error

            );



        }



    },









    init(){



        this.socket =

        io({


            auth:{


                clientType:

                "admin"


            },


            withCredentials:true


        });







        const EVENTS =

        window.MERIDIAN_EVENTS;









        this.socket.on(

            "admin_auth_expired",

            ()=>{


                if(window.MeridianAdminAuth){


                    window.MeridianAdminAuth

                    .redirectToLogin();


                }


            }

        );





        this.socket.on(

            "connect_error",

            error=>{


                if(

                    error

                    &&

                    error.message === "ADMIN_AUTH_REQUIRED"

                ){


                    if(window.MeridianAdminAuth){


                        window.MeridianAdminAuth

                        .redirectToLogin();


                    }


                    return;


                }


                console.error(

                    "Admin socket connection failed:",

                    error

                );


            }

        );







        this.socket.on(

            "connect",

            ()=>{


                console.log(

                    "Admin socket connected"

                );



                this.loadAdminState();



            }

        );









        /**
         * 用户消息
         *
         * Rich Message Sync
         */
        this.socket.on(

            EVENTS.ADMIN_USER_MESSAGE,

            (data)=>{



                MeridianConversationStore.addMessage(

                    data.userId,

                    {



                        messageId:

                        data.messageId,



                        message:

                        data.content

                        ||

                        data.message

                        ||

                        "",



                        content:

                        data.content

                        ||

                        data.message

                        ||

                        "",



                        messageType:

                        data.type

                        ||

                        "text",



                        metadata:

                        data.metadata

                        ||

                        {},



                        sender:

                        data.sender === "admin"

                        ?

                        "admin"

                        :

                        "user",



                        time:

                        data.time



                    }

                );







                const current =

                MeridianAdminState

                .getCurrentConversationId();







                if(

                    current === data.userId

                ){


                    MeridianAdminUI.renderConversation(

                        data.userId

                    );


                }



            }

        );









        /**
         * 客服回复消息
         *
         * Rich Message Sync
         */
        this.socket.on(

            EVENTS.ADMIN_REPLY,

            (data)=>{



                if(

                    !data.userId

                ){

                    return;

                }







                MeridianConversationStore.addMessage(

                    data.userId,

                    {



                        messageId:

                        data.messageId,



                        message:

                        data.content

                        ||

                        data.message

                        ||

                        "",



                        content:

                        data.content

                        ||

                        data.message

                        ||

                        "",



                        messageType:

                        data.type

                        ||

                        "text",



                        metadata:

                        data.metadata

                        ||

                        {},



                        sender:

                        "admin",



                        time:

                        data.time



                    }

                );







                const current =

                MeridianAdminState

                .getCurrentConversationId();







                if(

                    current === data.userId

                ){


                    MeridianAdminUI.renderConversation(

                        data.userId

                    );


                }



            }

        );









        /**
         * 在线状态更新
         */
        this.socket.on(

            EVENTS.ADMIN_PRESENCE_UPDATE,

            (data)=>{



                if(

                    !data.user

                ){

                    return;

                }







                if(

                    data.type==="online"

                ){



                    MeridianAdminState.addOnlineUser(

                        data.user

                    );


                }








                if(

                    data.type==="offline"

                ){



                    MeridianAdminState.addOfflineUser(

                        data.user

                    );


                }







                if(
    MeridianAdminUI.renderOnlineUsers
){

    MeridianAdminUI.renderOnlineUsers();

}



            }

        );









        /**
         * Session更新
         */
        this.socket.on(

            "admin_session_update",

            (data)=>{



                if(

                    !data.session

                ){

                    return;

                }







                MeridianAdminState.updateSession(

                    data.session

                );







                MeridianAdminUI.renderSessions();



            }

        );




    },









    /**
     * 发送客服消息
     *
     * Rich Message Compatible v2.1.0
     *
     * 支持：
     * text
     * image
     * file
     * link
     * link-card
     */
    sendReply(message){


        const user =

        MeridianAdminState.getCurrentUser();




        if(

            !user

            ||

            !user.socketId

        ){

            console.log(

                "No selected conversation"

            );

            return;

        }




        let outgoingMessage = message;



        if(

            window.MeridianAdminLinkCard

            &&

            typeof window.MeridianAdminLinkCard
            .normalizeOutgoingMessage === "function"

        ){


            outgoingMessage =

            window.MeridianAdminLinkCard
            .normalizeOutgoingMessage(

                outgoingMessage

            );


        }




        const messageId =

        "msg_" +

        Date.now() +

        "_" +

        Math.random()

        .toString(36)

        .substring(2,8);




        let type = "text";

        let content = outgoingMessage;

        let text = outgoingMessage;

        let metadata = {};



        if(

            typeof outgoingMessage === "object"

            &&

            outgoingMessage

            &&

            outgoingMessage.type

        ){


            type =

            outgoingMessage.type;


            content =

            outgoingMessage.content

            ||

            outgoingMessage.message

            ||

            "";


            text =

            outgoingMessage.message

            ||

            outgoingMessage.content

            ||

            "";


            metadata =

            outgoingMessage.metadata

            ||

            {};


        }




        if(!content){

            return;

        }




        if(

            !this.socket

            ||

            !this.socket.connected

        ){


            console.error(

                "Admin socket is not connected"

            );


            return;


        }


        this.socket.emit(

            window.MERIDIAN_EVENTS.ADMIN_REPLY,

            {


                messageId:

                messageId,


                socketId:

                user.socketId,


                userId:

                user.userId,


                message:

                text,


                content:

                content,


                type:

                type,


                metadata:

                metadata,


                time:

                MeridianTime.now()


            }

        );


    }



};