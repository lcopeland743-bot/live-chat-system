/**
 * Meridian Admin State
 *
 * Version:
 * v2.3.6
 *
 * Features:
 * - Unified Conversation List
 * - Current Conversation Restore
 * - AI Mode State
 * - Human Takeover State
 * - Visitor Classification Statistics
 */

window.MeridianAdminState = {


    sessions:[],


    onlineUsers:[],


    offlineUsers:[],


    visitorStats:{

        totalVisitors:0,

        activeConversations:0,

        silentVisitors:0,

        onlineVisitors:0,

        onlineSilentVisitors:0

    },


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


    setSessions(sessions){


        this.sessions =

        Array.isArray(sessions)

        ?

        sessions.slice()

        :

        [];


        this.sortSessions();


        this.sessions.forEach(

            session=>{


                if(

                    window.MeridianConversationStore

                ){


                    MeridianConversationStore

                    .updateSession(

                        session

                    );


                }


            }

        );


        if(this.currentConversationId){


            const current =

            this.getSessionByUserId(

                this.currentConversationId

            );


            if(current){


                this.currentUser =

                this.createCurrentUser(

                    current

                );


            }


            else{


                this.currentUser =

                null;


                this.currentConversationId =

                null;


                localStorage.removeItem(

                    this.storageKey

                );


            }


        }


    },


    setPresenceUsers(

        onlineUsers,

        offlineUsers

    ){


        this.onlineUsers =

        Array.isArray(onlineUsers)

        ?

        onlineUsers.slice()

        :

        [];


        this.offlineUsers =

        Array.isArray(offlineUsers)

        ?

        offlineUsers.slice()

        :

        [];


    },


    setVisitorStats(stats){


        const source =

        stats

        ||

        {};


        const normalizeCount =

        value=>

        Math.max(

            0,

            Number(value)

            ||

            0

        );


        this.visitorStats = {


            totalVisitors:

            normalizeCount(

                source.totalVisitors

            ),


            activeConversations:

            normalizeCount(

                source.activeConversations

            ),


            silentVisitors:

            normalizeCount(

                source.silentVisitors

            ),


            onlineVisitors:

            normalizeCount(

                source.onlineVisitors

            ),


            onlineSilentVisitors:

            normalizeCount(

                source.onlineSilentVisitors

            )


        };


    },


    getVisitorStats(){


        return this.visitorStats;


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


        const session =

        this.getConversationSessionByUserId(

            user.userId

        );


        if(!session){


            this.offlineUsers =

            this.offlineUsers.filter(

                item=>

                item.userId !== user.userId

            );


            return;


        }


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


    getConversationSessionByUserId(userId){


        return this.sessions.find(

            item=>

            item.userId === userId

        )

        ||

        null;


    },


    getPresenceSessionByUserId(userId){


        return this.onlineUsers.find(

            item=>

            item.userId === userId

        )

        ||

        this.offlineUsers.find(

            item=>

            item.userId === userId

        )

        ||

        null;


    },


    getSessionByUserId(userId){


        return this.getConversationSessionByUserId(

            userId

        )

        ||

        this.getPresenceSessionByUserId(

            userId

        );


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
