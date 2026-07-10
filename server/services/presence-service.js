/**
 * Meridian Presence Service
 *
 * 实时连接状态管理
 *
 * Version:
 * v2.0.0
 *
 * Features:
 * - Real Time Online Tracking
 * - Socket Presence
 * - Session Separation
 * - Heartbeat Foundation
 */



class PresenceService {



    constructor(){


        /**
         * 当前在线用户
         *
         * Key:
         * userId
         */
        this.users = new Map();



    }









    /**
     * 用户上线
     */
    addUser(userData){



        const user = {


            userId:

            userData.userId,



            socketId:

            userData.socketId,



            status:

            "online",



            page:

            userData.page || "",



            connectedAt:

            userData.connectedAt
            ||
            new Date().toISOString(),



            lastSeen:

            new Date().toISOString()



        };







        this.users.set(

            user.userId,

            user

        );







        return user;



    }









    /**
     * 获取在线用户
     */
    getUser(userId){



        return (

            this.users.get(userId)

            ||

            null

        );



    }









    /**
     * 判断是否在线
     */
    hasUser(userId){



        return this.users.has(

            userId

        );



    }









    /**
     * 用户离线
     */
    removeUser(userId){



        const user =

        this.users.get(

            userId

        );







        if(!user){


            return null;


        }







        user.status =

        "offline";







        user.lastSeen =

        new Date().toISOString();







        this.users.delete(

            userId

        );







        return user;



    }









    /**
     * 根据Socket删除
     */
    removeUserBySocket(socketId){



        for(

            const [

                userId,

                user

            ]

            of this.users.entries()

        ){



            if(

                user.socketId

                ===

                socketId

            ){



                return this.removeUser(

                    userId

                );


            }


        }







        return null;



    }









    /**
     * 更新最后活动时间
     *
     * Heartbeat Foundation
     */
    updateLastSeen(userId){



        const user =

        this.users.get(

            userId

        );







        if(user){



            user.lastSeen =

            new Date()

            .toISOString();



        }







        return user;



    }









    /**
     * 获取全部在线用户
     */
    getOnlineUsers(){



        return Array.from(

            this.users.values()

        );



    }









    /**
     * 清理内存状态
     *
     * Server Restart
     */
    clear(){



        this.users.clear();



    }









    /**
     * 在线数量
     */
    count(){



        return this.users.size;



    }



}







module.exports =

new PresenceService();