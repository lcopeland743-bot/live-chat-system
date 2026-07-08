/**
 * Meridian Admin State
 *
 * 后台状态管理
 *
 * Version: v1.1.0
 */


window.MeridianAdminState = {


    /**
     * 在线用户
     */
    onlineUsers: [],



    /**
     * 离线用户
     */
    offlineUsers: [],



    /**
     * 当前聊天用户
     */
    currentUser:null,





    /**
     * 添加在线用户
     */
    addOnlineUser(user){


        this.removeOfflineUser(
            user.userId
        );



        const exists =
        this.onlineUsers.find(

            item =>
            item.userId === user.userId

        );



        if(!exists){


            this.onlineUsers.push(
                user
            );


        }


    },





    /**
     * 用户离线
     */
    addOfflineUser(user){


        this.removeOnlineUser(
            user.userId
        );



        const exists =
        this.offlineUsers.find(

            item =>
            item.userId === user.userId

        );



        if(!exists){


            this.offlineUsers.push(

                user

            );


        }
        else{


            Object.assign(

                exists,

                user

            );


        }


    },





    /**
     * 删除在线用户
     */
    removeOnlineUser(userId){


        this.onlineUsers =
        this.onlineUsers.filter(

            user =>
            user.userId !== userId

        );


    },





    /**
     * 删除离线用户
     */
    removeOfflineUser(userId){


        this.offlineUsers =
        this.offlineUsers.filter(

            user =>
            user.userId !== userId

        );


    },





    /**
     * 获取在线用户
     */
    getOnlineUsers(){


        return this.onlineUsers;


    },





    /**
     * 获取离线用户
     */
    getOfflineUsers(){


        return this.offlineUsers;


    },





    /**
     * 当前聊天用户
     */
    setCurrentUser(user){


        this.currentUser = user;


    },



    getCurrentUser(){


        return this.currentUser;


    }



};