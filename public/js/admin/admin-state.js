/**
 * Meridian Admin State
 *
 * 后台会话状态管理
 *
 * Version:
 * v2.0.0
 *
 * Features:
 * - Unified Conversation List
 * - Session Management
 * - Current Conversation Restore
 * - Multi Agent Foundation
 * - Unread System Foundation
 */



window.MeridianAdminState = {



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
     * 更新Session
     */
    updateSession(session){



        const exists =

        this.sessions.find(

            item =>

            item.userId === session.userId

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







        this.sortSessions();








        if(

            window.MeridianConversationStore

        ){



            MeridianConversationStore.updateSession(

                session

            );

        }



    },









    /**
     * Session排序
     *
     * 最新活动优先
     */
    sortSessions(){



        this.sessions.sort(

            (a,b)=>{



                const timeA =

                new Date(

                    a.updatedAt

                    ||

                    a.lastMessageAt

                    ||

                    0

                );







                const timeB =

                new Date(

                    b.updatedAt

                    ||

                    b.lastMessageAt

                    ||

                    0

                );







                return timeB-timeA;



            }

        );



    },









    /**
     * 获取全部会话
     */
    getSessions(){



        return this.sessions;



    },









    /**
     * 恢复当前Session
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

            item =>

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

            session.status,



            assignedAgentId:

            session.assignedAgentId



        };







        return session;



    },









    /**
     * 选择会话
     */
    selectSession(session){



        this.currentUser = {


            userId:

            session.userId,



            socketId:

            session.socketId,



            status:

            session.status,



            assignedAgentId:

            session.assignedAgentId



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