/**
 * Meridian Presence Service
 *
 * 管理用户在线状态
 *
 * v1.1.0
 */


class PresenceService {


    constructor(){


        /**
         * 在线用户存储
         *
         * Key:
         * userId
         *
         * Value:
         * 用户状态信息
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
            userData.connectedAt,


            lastSeen:
            null


        };



        this.users.set(

            user.userId,

            user

        );



        return user;


    }




    /**
     * 根据 userId 获取用户
     */
    getUser(userId){


        return (
            this.users.get(userId)
            ||
            null
        );


    }





    /**
     * 用户离线
     */
    removeUser(userId){



        const user =
        this.users.get(userId);



        if(!user){

            return null;

        }



        user.status =
        "offline";



        user.lastSeen =
        new Date()
        .toISOString();



        this.users.delete(
            userId
        );



        return user;


    }





    /**
     * 根据 socketId 删除用户
     *
     * Socket断开时使用
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
     * 获取全部在线用户
     */
    getOnlineUsers(){



        return Array.from(
            this.users.values()
        );


    }





    /**
     * 获取在线人数
     */
    count(){


        return this.users.size;


    }


}



module.exports =
new PresenceService();