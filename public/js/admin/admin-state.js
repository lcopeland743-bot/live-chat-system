/**
 * Meridian Admin State
 *
 * Version:
 * v2.2.0
 *
 * Features:
 * - Unified Conversation List
 * - Current Conversation Restore
 * - AI Mode State
 * - Human Takeover State
 */

window.MeridianAdminState = {


    sessions:[],


    onlineUsers:[],


    offlineUsers:[],


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


    createCurrentUser(session){


        return {


            userId:

            session.userId,


            socketId:

            session.socketId,


            status:

            session.status,


            assignedAgentId:

            session.assignedAgentId,


            aiMode:

            session.aiMode

            ||

            "off",


            humanTakeover:

            session.humanTakeover === true


        };


    },


    updateSession(session){


        const exists =

        this.sessions.find(

            item=>

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

            this.currentConversationId

            ===

            session.userId

        ){


            this.currentUser =

            this.createCurrentUser(

                exists

                ||

                session

            );


        }


        if(

            window.MeridianConversationStore

        ){


            MeridianConversationStore

            .updateSession(

                session

            );


        }


    },


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


                return timeB - timeA;


            }

        );


    },


    addOnlineUser(user){


        if(

            !user

            ||

            !user.userId

        ){


            return;


        }


        this.offlineUsers =

        this.offlineUsers.filter(

            item=>

            item.userId !== user.userId

        );


        const exists =

        this.onlineUsers.find(

            item=>

            item.userId === user.userId

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


        if(

            !user

            ||

            !user.userId

        ){


            return;


        }


        this.onlineUsers =

        this.onlineUsers.filter(

            item=>

            item.userId !== user.userId

        );


        const exists =

        this.offlineUsers.find(

            item=>

            item.userId === user.userId

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


    getSessions(){


        return this.sessions;


    },


    getSessionByUserId(userId){


        return this.sessions.find(

            item=>

            item.userId === userId

        )

        ||

        null;


    },


    restoreSessionUser(){


        if(

            !this.currentUser

            ||

            !this.currentUser.userId

        ){


            return null;


        }


        const session =

        this.getSessionByUserId(

            this.currentUser.userId

        );


        if(!session){


            return null;


        }


        this.currentUser =

        this.createCurrentUser(

            session

        );


        return session;


    },


    selectSession(session){


        this.currentUser =

        this.createCurrentUser(

            session

        );


        this.currentConversationId =

        session.userId;


        this.saveCurrentSession();


        if(

            window.MeridianConversationStore

        ){


            MeridianConversationStore

            .createConversation(

                session

            );


        }


        if(

            window.MeridianAdminAI

        ){


            window.MeridianAdminAI

            .renderSession(

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
