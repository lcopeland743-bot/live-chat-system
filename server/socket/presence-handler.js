/**
 * Meridian Presence Handler
 *
 * Socket 层在线状态处理
 *
 * Version: v1.1.0
 */


const presenceService =
require("../services/presence-service");


const MeridianTime =
require("../utils/time");



/**
 * 注册 Presence Socket Handler
 *
 * @param io Socket.io Server
 * @param socket 当前连接
 */
function registerPresenceHandler(
    io,
    socket
){



    /**
     * 用户上线事件
     *
     * Client
     *   ↓
     * Server
     */
    socket.on(
        "USER_ONLINE",
        (data)=>{


            const user =
            presenceService.addUser({

                userId:
                data.userId,


                socketId:
                socket.id,


                page:
                data.page,


                connectedAt:
                MeridianTime.now()

            });



            console.log(
                "[Presence] User online:",
                user
            );



            /**
             * 通知管理员
             *
             * Server
             *    ↓
             * Admin
             */
            io.emit(
                "ADMIN_PRESENCE_UPDATE",
                {

                    type:"online",

                    user:user

                }
            );


        }
    );





    /**
     * Socket断开
     *
     * 用户关闭页面
     * 网络断开
     */
    socket.on(
        "disconnect",
        ()=>{


            const user =
            presenceService.removeUserBySocket(
                socket.id
            );



            if(!user){

                return;

            }



            console.log(
                "[Presence] User offline:",
                user
            );



            /**
             * 通知管理员
             */
            io.emit(
                "ADMIN_PRESENCE_UPDATE",
                {

                    type:"offline",

                    user:user

                }
            );


        }
    );



}



module.exports =
registerPresenceHandler;