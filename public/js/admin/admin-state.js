/**
 * Meridian Admin State
 *
 * 后台状态管理
 *
 * Version:
 * v1.2.5
 *
 * Features:
 * - Online Users
 * - Offline Users
 * - Sessions
 * - Current Conversation
 * - Conversation Store
 * - Current User Persistence
 */



window.MeridianAdminState = {



    onlineUsers: [],


    offlineUsers: [],


    sessions: [],



    currentUser:null,



    currentConversationId:null,



    storageKey:

    "meridian_current_session",







    init(){



        const saved =

        localStorage.getItem(

            this.storageKey

        );






        if(!saved){

            return;

        }






        try{



            const data =

            JSON.parse(saved);





            this.currentConversationId =

            data.userId;






            this.currentUser = {


                userId:

                data.userId



            };



        }

        catch(error){



            console.error(

                "Restore session failed",

                error

            );


        }



    },









    saveCurrentSession(){



        if(

            !this.currentUser

            ||

            !this.currentUser.userId

        ){

            return;

        }







        localStorage.setItem(

            this.storageKey,

            JSON.stringify({


                userId:

                this.currentUser.userId



            })

        );



    },









    /**
     * 根据userId恢复最新Session
     */
    restoreSessionUser(){



        if(

            !this.currentUser

            ||

            !this.currentUser.userId

        ){

            return null;

        }







        const session =

        this.sessions.find(

            item=>

            item.userId ===

            this.currentUser.userId

        );








        if(!session){

            return null;

        }








        this.currentUser = {


            userId:

            session.userId,



            socketId:

            session.socketId,



            status:

            session.status



        };








        return session;



    },









    addOnlineUser(user){



        this.removeOfflineUser(

            user.userId

        );






        const exists =

        this.onlineUsers.find(

            item=>

            item.userId===user.userId

        );






        if(exists){



            Object.assign(

                exists,

                user

            );


        }

        else{


            this.onlineUsers.push(

                user

            );


        }



    },









    addOfflineUser(user){



        this.removeOnlineUser(

            user.userId

        );






        const exists =

        this.offlineUsers.find(

            item=>

            item.userId===user.userId

        );






        if(exists){



            Object.assign(

                exists,

                user

            );


        }

        else{


            this.offlineUsers.push(

                user

            );


        }



    },









    removeOnlineUser(userId){


        this.onlineUsers =

        this.onlineUsers.filter(

            item=>

            item.userId!==userId

        );


    },









    removeOfflineUser(userId){


        this.offlineUsers =

        this.offlineUsers.filter(

            item=>

            item.userId!==userId

        );


    },









    updateSession(session){



        const exists =

        this.sessions.find(

            item=>

            item.userId===session.userId

        );






        if(exists){



            Object.assign(

                exists,

                session

            );


        }

        else{


            this.sessions.push(

                session

            );


        }








        if(

            window.MeridianConversationStore

        ){



            MeridianConversationStore.updateSession(

                session

            );


        }



    },









    getSessions(){


        return this.sessions;


    },









    selectSession(session){



        this.currentUser = {


            userId:

            session.userId,



            socketId:

            session.socketId,



            status:

            session.status



        };






        this.currentConversationId =

        session.userId;






        this.saveCurrentSession();








        if(

            window.MeridianConversationStore

        ){



            MeridianConversationStore.createConversation(

                session

            );


        }



    },









    getCurrentUser(){


        return this.currentUser;


    },









    getCurrentConversationId(){


        return this.currentConversationId;


    }





};