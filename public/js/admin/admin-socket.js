/**
 * Meridian Admin Socket
 *
 * 后台 Socket 通信
 *
 * Version: v1.1.0
 */


window.MeridianAdminSocket = {


    socket:null,



    init(){


        this.socket = io();



        const EVENTS =
        window.MERIDIAN_EVENTS;



        /**
         * 用户进入
         */
        this.socket.on(

            EVENTS.ADMIN_USER_ENTER,

            (data)=>{


                MeridianAdminState.setCurrentUser(
                    data
                );


                MeridianAdminUI.addEnter(
                    data
                );


            }

        );





        /**
         * 用户消息
         */
        this.socket.on(

            EVENTS.ADMIN_USER_MESSAGE,

            (data)=>{


                MeridianAdminState.setCurrentUser(
                    data
                );


                MeridianAdminUI.addMessage(

                    data.message,

                    "user",

                    data.time

                );


            }

        );





        /**
         * 客服回复回显
         */
        this.socket.on(

            EVENTS.ADMIN_REPLY,

            (data)=>{


                MeridianAdminUI.addMessage(

                    data.message,

                    "admin",

                    data.time

                );


            }

        );







        /**
         * Presence状态更新
         */
        this.socket.on(

            EVENTS.ADMIN_PRESENCE_UPDATE,

            (data)=>{


                if(
                    !data
                    ||
                    !data.user
                ){

                    return;

                }





                /**
                 * 在线
                 */
                if(
                    data.type === "online"
                ){


                    MeridianAdminState.addOnlineUser(

                        data.user

                    );


                }






                /**
                 * 离线
                 */
                if(
                    data.type === "offline"
                ){


                    MeridianAdminState.addOfflineUser(

                        data.user

                    );


                }





                MeridianAdminUI.renderOnlineUsers();



                if(
                    MeridianAdminUI.renderOfflineUsers
                ){


                    MeridianAdminUI.renderOfflineUsers();


                }



            }

        );





    },






    /**
     * 发送客服回复
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
                "No active user"
            );


            return;

        }





        this.socket.emit(

            window.MERIDIAN_EVENTS.ADMIN_REPLY,

            {

                socketId:
                user.socketId,


                message:
                message,


                time:
                MeridianTime.now()


            }

        );



    }



};