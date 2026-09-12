/**
 * Meridian Presence Client
 *
 * 用户在线状态管理
 *
 * Version: v1.1.0
 *
 * Features:
 * - User Online
 * - User Offline
 * - Session Trigger
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





        const userId =
        window.MeridianConfig.user.id;



        const page =
        window.MeridianConfig.user.page;



        const conversationId =
        window.MeridianConfig.user.conversationId;


        const landingContext =
        window.MeridianConfig.user.landingContext;





        /**
         * 用户上线
         */
        console.log(

            "Sending USER_ONLINE",

            {

                userId:userId,

                conversationId:conversationId,

                page:page

            }

        );





        const onlinePayload = {


                userId:userId,


                conversationId:conversationId,


                page:page,


                time:
                MeridianTime.now()


        };


        if(

            landingContext

            &&

            landingContext.campaignId

        ){


            onlinePayload.landingContext =
            landingContext;


        }


        socket.emit(

            EVENTS.USER_ONLINE,

            onlinePayload

        );





        MeridianLogger.info(
            "Presence online sent"
        );







        /**
         * 用户离开
         */
        window.addEventListener(

            "beforeunload",

            ()=>{


                console.log(

                    "Sending USER_OFFLINE",

                    {

                        userId:userId

                    }

                );




                socket.emit(

                    EVENTS.USER_OFFLINE,

                    {


                        userId:userId,


                        time:
                        MeridianTime.now()


                    }

                );



            }

        );



    }



};
