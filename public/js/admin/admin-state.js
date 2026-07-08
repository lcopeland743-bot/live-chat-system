/**
 * Meridian Admin State
 *
 * 后台状态管理
 *
 * Version: v1.1.0
 */


window.MeridianAdminState = {


    /**
     * 在线用户列表
     */
    onlineUsers: [],



    /**
     * 当前聊天用户
     */
    currentUser: null,



    /**
     * 添加在线用户
     */
    addOnlineUser(user){


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
     * 移除在线用户
     */
    removeOnlineUser(userId){


        this.onlineUsers =
        this.onlineUsers.filter(

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
     * 设置当前聊天用户
     */
    setCurrentUser(user){


        this.currentUser = user;


    },




    /**
     * 获取当前聊天用户
     */
    getCurrentUser(){


        return this.currentUser;


    }


};