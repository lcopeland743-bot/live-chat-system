/**
 * Meridian Admin Socket
 *
 * Version:
 * v2.3.6
 *
 * Features:
 * - Authenticated Admin Socket
 * - AI Message Sync
 * - AI Suggestion Sync
 * - AI Error Sync
 * - Rich Message Sync
 * - Visitor Statistics Refresh
 */

window.MeridianAdminSocket = {


    socket:null,


    stateRefreshTimer:null,


    stateRequestSerial:0,


    pendingRestoreCurrentSession:false,


    scheduleAdminStateRefresh(delay = 250){


        clearTimeout(

            this.stateRefreshTimer

        );


        this.stateRefreshTimer =

        setTimeout(

            ()=>{


                this.loadAdminState({

                    restoreCurrentSession:false

                });


            },

            delay

        );


    },


    async loadAdminState(options = {}){


        try{


            if(

                options.restoreCurrentSession

                !==

                false

            ){


                this.pendingRestoreCurrentSession =

                true;


            }


            const requestId =

            ++this.stateRequestSerial;


            const response =

            await fetch(

                "/api/admin/state",

                {


                    credentials:"same-origin",


                    cache:"no-store"


                }

            );


            if(

                window.MeridianAdminAuth

                &&

                window.MeridianAdminAuth

                .handleUnauthorizedResponse(

                    response

                )

            ){


                return;


            }


            const result =

            await response.json();


            if(!result.success){


                return;


            }


            if(

                requestId !==

                this.stateRequestSerial

            ){


                return;


            }


            MeridianAdminState.setPresenceUsers(

                result.onlineUsers

                ||

                [],


                result.offlineUsers

                ||

                []

            );


            MeridianAdminState.setSessions(

                result.sessions

                ||

                []

            );


            MeridianAdminState.setVisitorStats(

                result.visitorStats

                ||

                {}

            );


            MeridianAdminUI.renderSessions(

                false

            );


            if(

                MeridianAdminUI.renderOnlineUsers

            ){


                MeridianAdminUI.renderOnlineUsers();


            }


            if(

                MeridianAdminUI.renderVisitorStats

            ){


                MeridianAdminUI.renderVisitorStats();


            }


            if(

                this.pendingRestoreCurrentSession

            ){


                this.pendingRestoreCurrentSession =

                false;


                setTimeout(

                    ()=>{


                        if(

                            MeridianAdminUI.restoreCurrentSession

                        ){


                            MeridianAdminUI.restoreCurrentSession();


                        }


                    },

                    300

                );


            }


            console.log(

                "Admin state restored:",

                result

            );


        }

        catch(error){


            console.error(

                "Admin state restore failed:",

                error

            );


        }


    },


    normalizeSender(data){


        if(

            data.sender === "ai"

        ){


            return "ai";


        }


        if(

            data.sender === "admin"

        ){


            return "admin";


        }


        return "user";


    },


    addIncomingMessage(data){


        if(!data.userId){


            return;


        }


        MeridianConversationStore.addMessage(

            data.userId,

            {


                messageId:

                data.messageId,


                message:

                data.content

                ||

                data.message

                ||

                "",


                content:

                data.content

                ||

                data.message

                ||

                "",


                messageType:

                data.type

                ||

                "text",


                metadata:

                data.metadata

                ||

                {},


                sender:

                this.normalizeSender(data),


                time:

                data.time


            }

        );


        const current =

        MeridianAdminState

        .getCurrentConversationId();


        if(

            current === data.userId

        ){


            MeridianAdminUI

            .renderConversation(

                data.userId

            );


        }


        this.scheduleAdminStateRefresh();


    },


    init(){


        this.socket =

        io({


            auth:{


                clientType:"admin"


            },


            withCredentials:true


        });


        const EVENTS =

        window.MERIDIAN_EVENTS;


        this.socket.on(

            "admin_auth_expired",

            ()=>{


                if(window.MeridianAdminAuth){


                    window.MeridianAdminAuth

                    .redirectToLogin();


                }


            }

        );


        this.socket.on(

            "connect_error",

            error=>{


                if(

                    error

                    &&

                    error.message === "ADMIN_AUTH_REQUIRED"

                ){


                    if(window.MeridianAdminAuth){


                        window.MeridianAdminAuth

                        .redirectToLogin();


                    }


                    return;


                }


                console.error(

                    "Admin socket connection failed:",

                    error

                );


            }

        );


        this.socket.on(

            "connect",

            ()=>{


                console.log(

                    "Admin socket connected"

                );


                this.loadAdminState();


            }

        );


        this.socket.on(

            EVENTS.ADMIN_USER_MESSAGE,

            data=>{


                this.addIncomingMessage(

                    data

                );


            }

        );


        this.socket.on(

            EVENTS.ADMIN_REPLY,

            data=>{


                this.addIncomingMessage(

                    data

                );


            }

        );


        this.socket.on(

            "admin_ai_suggestion",

            data=>{


                if(window.MeridianAdminAI){


                    window.MeridianAdminAI

                    .receiveSuggestion(

                        data

                    );


                }


            }

        );


        this.socket.on(

            "admin_ai_error",

            data=>{


                if(window.MeridianAdminAI){


                    window.MeridianAdminAI

                    .receiveError(

                        data

                    );


                }


            }

        );


        this.socket.on(

            EVENTS.ADMIN_PRESENCE_UPDATE,

            data=>{


                if(!data.user){


                    return;


                }


                if(data.type === "online"){


                    MeridianAdminState.addOnlineUser(

                        data.user

                    );


                }


                if(data.type === "offline"){


                    MeridianAdminState.addOfflineUser(

                        data.user

                    );


                }


                if(

                    MeridianAdminUI.renderOnlineUsers

                ){


                    MeridianAdminUI.renderOnlineUsers();


                }


                this.scheduleAdminStateRefresh();


            }

        );


        this.socket.on(

            "admin_session_update",

            data=>{


                if(!data.session){


                    return;


                }


                MeridianAdminState.updateSession(

                    data.session

                );


                MeridianAdminUI.renderSessions(

                    false

                );


                this.scheduleAdminStateRefresh();


                const current =

                MeridianAdminState

                .getCurrentConversationId();


                if(

                    current === data.session.userId

                    &&

                    window.MeridianAdminAI

                ){


                    window.MeridianAdminAI

                    .renderSession(

                        data.session

                    );


                }


            }

        );


    },


    sendReply(message){


        const user =

        MeridianAdminState

        .getCurrentUser();


        if(

            !user

            ||

            !user.socketId

        ){


            console.log(

                "No selected conversation"

            );


            return;


        }


        let outgoingMessage =

        message;


        if(

            window.MeridianAdminAI

            &&

            typeof window.MeridianAdminAI

            .decorateOutgoingMessage === "function"

        ){


            outgoingMessage =

            window.MeridianAdminAI

            .decorateOutgoingMessage(

                outgoingMessage

            );


        }


        if(

            window.MeridianAdminLinkCard

            &&

            typeof window.MeridianAdminLinkCard

            .normalizeOutgoingMessage === "function"

        ){


            outgoingMessage =

            window.MeridianAdminLinkCard

            .normalizeOutgoingMessage(

                outgoingMessage

            );


        }


        const messageId =

        "msg_"

        +

        Date.now()

        +

        "_"

        +

        Math.random()

        .toString(36)

        .substring(2,8);


        let type =

        "text";


        let content =

        outgoingMessage;


        let text =

        outgoingMessage;


        let metadata =

        {};


        if(

            typeof outgoingMessage === "object"

            &&

            outgoingMessage

            &&

            outgoingMessage.type

        ){


            type =

            outgoingMessage.type;


            content =

            outgoingMessage.content

            ||

            outgoingMessage.message

            ||

            "";


            text =

            outgoingMessage.message

            ||

            outgoingMessage.content

            ||

            "";


            metadata =

            outgoingMessage.metadata

            ||

            {};


        }


        if(!content){


            return;


        }


        if(

            !this.socket

            ||

            !this.socket.connected

        ){


            console.error(

                "Admin socket is not connected"

            );


            return;


        }


        this.socket.emit(

            window.MERIDIAN_EVENTS.ADMIN_REPLY,

            {


                messageId:

                messageId,


                socketId:

                user.socketId,


                userId:

                user.userId,


                message:

                text,


                content:

                content,


                type:

                type,


                metadata:

                metadata,


                time:

                MeridianTime.now()


            }

        );


        if(

            metadata.source === "openai-assist"

            &&

            window.MeridianAdminAI

        ){


            window.MeridianAdminAI

            .markSuggestionUsed();


        }


    }


};
