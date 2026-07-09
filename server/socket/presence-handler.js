/**
 * Meridian Presence Handler
 *
 * Version:
 * v1.2.0
 *
 * Features:
 * - Presence Online
 * - Presence Offline
 * - MongoDB Session
 */



const presenceService =
require("../services/presence-service");



const sessionService =
require("../services/session-service");



const MeridianTime =
require("../utils/time");








function registerPresenceHandler(
    io,
    socket
){






    /**
     * 用户上线
     */
    socket.on(

        "user_online",

        async(data)=>{



            const time =
            MeridianTime.now();






            const user =
            presenceService.addUser({

                userId:
                data.userId,


                socketId:
                socket.id,


                page:
                data.page,


                connectedAt:
                time


            });







            const session =

            await sessionService.createSession({



                userId:
                data.userId,



                socketId:
                socket.id,



                page:
                data.page,



                time:
                time



            });







            console.log(

                "[Presence] User online:",

                user

            );







            console.log(

                "[Session] Created:",

                session

            );








            /**
             * 推送在线状态
             */
            io.emit(

                "admin_presence_update",

                {


                    type:
                    "online",



                    user:
                    user,



                    session:
                    session



                }

            );









            /**
             * 推送Session
             */
            io.emit(

                "admin_session_update",

                {


                    type:
                    "create",



                    session:
                    session



                }

            );




        }

    );









    /**
     * 用户主动离开
     */
    socket.on(

        "user_offline",

        ()=>{


            handleOffline();


        }

    );









    /**
     * Socket断开
     */
    socket.on(

        "disconnect",

        ()=>{


            handleOffline();


        }

    );









    async function handleOffline(){



        const time =
        MeridianTime.now();






        const user =
        presenceService.removeUserBySocket(

            socket.id

        );






        if(!user){


            return;


        }






        const session =

        await sessionService.offline(

            user.userId,

            time

        );






        console.log(

            "[Presence] User offline:",

            user

        );







        console.log(

            "[Session] Offline:",

            session

        );









        io.emit(

            "admin_presence_update",

            {


                type:
                "offline",



                user:
                user,



                session:
                session



            }

        );








        io.emit(

            "admin_session_update",

            {


                type:
                "update",



                session:
                session



            }

        );




    }







}







module.exports =
registerPresenceHandler;