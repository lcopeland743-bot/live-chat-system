/**
 * Meridian Presence Client
 *
 * 用户在线状态管理
 *
 * Version: v1.1.0
 */


window.MeridianPresence = {


    init(){


        const socket =
        window.MeridianSocket.socket;


        const EVENTS =
        window.MERIDIAN_EVENTS;



        if(!socket){

            MeridianLogger.error(
                "Presence: Socket not connected"
            );

            return;

        }



        if(!EVENTS){

            MeridianLogger.error(
                "Presence: Events not loaded"
            );

            return;

        }





        /**
         * 用户上线
         */
        socket.emit(

            EVENTS.USER_ONLINE,

            {

                userId:
                window.MeridianConfig.user.id,


                page:
                window.MeridianConfig.user.page,


                time:
                MeridianTime.now()

            }

        );



        MeridianLogger.info(
            "Presence online sent"
        );





        /**
         * 用户离开页面
         */
        window.addEventListener(
            "beforeunload",
            ()=>{


                socket.emit(

                    EVENTS.USER_OFFLINE,

                    {

                        userId:
                        window.MeridianConfig.user.id,


                        time:
                        MeridianTime.now()

                    }

                );


            }
        );



    }



};