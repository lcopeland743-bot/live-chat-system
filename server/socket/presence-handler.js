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
     * 用户上线
     *
     * Client
     * ↓
     * Server
     */
    socket.on(
        "user_online",
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
             * 通知后台
             */
            io.emit(
                "admin_presence_update",
                {

                    type:"online",

                    user:user

                }
            );


        }
    );





    /**
     * 用户离线
     */
    socket.on(
        "user_offline",
        (data)=>{


            const user =
            presenceService.removeUser(
                data.userId
            );



            if(!user){

                return;

            }



            console.log(
                "[Presence] User offline:",
                user
            );



            io.emit(
                "admin_presence_update",
                {

                    type:"offline",

                    user:user

                }
            );


        }
    );





    /**
     * Socket断开保护
     *
     * 浏览器异常关闭
     * 网络中断
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
                "[Presence] Socket offline:",
                user
            );



            io.emit(
                "admin_presence_update",
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