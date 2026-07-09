/**
 * Meridian Presence Service
 *
 * 用户在线状态管理
 *
 * Version:
 * v1.2.3
 *
 * Features:
 * - Online Users
 * - Offline Users
 * - Presence Restore
 */



class PresenceService {



    constructor(){


        /**
         * 在线用户
         *
         * Key:
         * userId
         */
        this.users = new Map();





        /**
         * 离线用户
         *
         * Key:
         * userId
         */
        this.offlineUsers = new Map();



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

            userData.connectedAt,



            lastSeen:

            null



        };







        /**
         * 从离线列表移除
         */
        this.offlineUsers.delete(

            user.userId

        );







        /**
         * 加入在线
         */
        this.users.set(

            user.userId,

            user

        );







        return user;



    }









    /**
     * 获取用户
     */
    getUser(userId){


        return (

            this.users.get(userId)

            ||

            this.offlineUsers.get(userId)

            ||

            null

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

        new Date()

        .toISOString();








        /**
         * 删除在线
         */
        this.users.delete(

            userId

        );







        /**
         * 保存离线
         */
        this.offlineUsers.set(

            userId,

            user

        );







        return user;



    }









    /**
     * 根据socket删除
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
     * 获取在线用户
     */
    getOnlineUsers(){



        return Array.from(

            this.users.values()

        );


    }









    /**
     * 获取离线用户
     */
    getOfflineUsers(){



        return Array.from(

            this.offlineUsers.values()

        );


    }









    /**
     * 获取全部状态
     */
    getAllUsers(){



        return {


            onlineUsers:

            this.getOnlineUsers(),



            offlineUsers:

            this.getOfflineUsers()



        };


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