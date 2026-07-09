/**
 * Meridian Admin Socket
 *
 * 多会话消息管理
 *
 * Version:
 * v1.2.7
 *
 * Features:
 * - Admin State Restore
 * - Session Restore
 * - Online Offline Restore
 * - History Restore Trigger
 * - Conversation Store
 * - Message Isolation
 * - MessageId Complete Support
 */



window.MeridianAdminSocket = {



    socket:null,







    async loadAdminState(){



        try{



            const response =

            await fetch(

                "/api/admin/state"

            );







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

            MeridianAdminUI.renderOnlineUsers();

            MeridianAdminUI.renderOfflineUsers();









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

        io();







        const EVENTS =

        window.MERIDIAN_EVENTS;









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

                        data.message,



                        type:

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

                        data.message,



                        type:

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







                MeridianAdminUI.renderOnlineUsers();

                MeridianAdminUI.renderOfflineUsers();



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








        const messageId =

        "msg_" +

        Date.now() +

        "_" +

        Math.random()

        .toString(36)

        .substring(2,8);








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

                message,



                time:

                MeridianTime.now()



            }

        );



    }



};