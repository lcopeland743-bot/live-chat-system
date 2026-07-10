/**
 * Meridian Presence Handler
 *
 * 实时状态同步
 *
 * Version:
 * v2.0.0
 *
 * Features:
 * - Unified Presence
 * - Session Sync
 * - Socket Online Tracking
 * - Offline Recovery
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







            /**
             * 清理旧连接
             */
            const oldUser =

            presenceService.getUser(

                data.userId

            );







            if(oldUser){



                presenceService.removeUser(

                    data.userId

                );


            }








            /**
             * 创建在线状态
             */
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








            /**
             * 创建/更新Session
             */
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

                "[Presence] Online:",

                user

            );







            console.log(

                "[Session] Updated:",

                session

            );








            /**
             * 通知后台
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

        presenceService

        .removeUserBySocket(

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

            "[Presence] Offline:",

            user

        );







        console.log(

            "[Session] Offline:",

            session

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