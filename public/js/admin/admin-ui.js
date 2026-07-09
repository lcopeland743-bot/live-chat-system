/**
 * Meridian Admin UI
 *
 * 多会话工作台
 *
 * Version:
 * v1.2.6
 *
 * Features:
 * - Conversation Switching
 * - MongoDB History Loading
 * - Session Rendering
 * - Auto Current Conversation Restore
 * - History Recovery
 */



window.MeridianAdminUI = {



    historyLoaded:{},







    init(){



        this.messages =

        document.getElementById(

            "adminMessages"

        );







        this.sessions =

        document.getElementById(

            "sessions"

        );







        this.onlineUsers =

        document.getElementById(

            "onlineUsers"

        );







        this.offlineUsers =

        document.getElementById(

            "offlineUsers"

        );







        this.input =

        document.getElementById(

            "adminReplyInput"

        );







        this.sendButton =

        document.getElementById(

            "adminSendBtn"

        );



    },









    /**
     * 自动恢复当前聊天
     */
    async restoreCurrentSession(){



        const current =

        MeridianAdminState

        .getCurrentUser();








        if(

            !current

            ||

            !current.userId

        ){



            return;

        }








        /**
         * 使用最新Session
         *
         * 更新socketId
         */
        const session =

        MeridianAdminState

        .restoreSessionUser();








        if(!session){



            return;

        }








        MeridianAdminState.selectSession(

            session

        );








        await this.loadHistory(

            session.userId

        );








        this.renderConversation(

            session.userId

        );



    },









    async loadHistory(userId){



        if(

            !window.MeridianHistoryLoader

        ){

            return;

        }








        if(

            this.historyLoaded[userId]

        ){

            return;

        }








        try{



            const messages =

            await MeridianHistoryLoader.load(

                userId

            );








            messages.forEach(

                msg=>{



                    MeridianConversationStore.addMessage(
    userId,
    {
        messageId: msg.messageId,

        message: msg.content,

        type:
        msg.sender==="admin"
        ?
        "admin"
        :
        "user",

        time: msg.createdAt
    }
);



                }

            );








            this.historyLoaded[userId]=true;



        }

        catch(error){



            console.error(

                "History load failed:",

                error

            );


        }



    },









    renderConversation(userId){



        if(!this.messages){



            return;


        }








        const messages =

        MeridianConversationStore

        .getMessages(

            userId

        );








        this.messages.innerHTML="";








        messages.forEach(

            msg=>{



                const div =

                document.createElement(

                    "div"

                );







                div.className=

                "message "+msg.type;








                div.innerHTML=

                `

                <div>

                ${msg.message}

                </div>


                <small>

                ${msg.time||""}

                </small>

                `;








                this.messages.appendChild(

                    div

                );



            }

        );








        this.messages.scrollTop =

        this.messages.scrollHeight;



    },
    renderSessions(){



        if(!this.sessions){


            return;


        }








        const sessions =

        MeridianAdminState

        .getSessions();








        this.sessions.innerHTML="";








        sessions.forEach(

            session=>{



                const div =

                document.createElement(

                    "div"

                );








                div.className =

                "session-item";








                div.style.cursor =

                "pointer";








                div.innerHTML =

                `

                <b>

                ${session.userId}

                </b>


                <br>


                状态:

                ${session.status}

                `;








                div.onclick =

                async()=>{



                    MeridianAdminState.selectSession(

                        session

                    );








                    await this.loadHistory(

                        session.userId

                    );








                    this.renderConversation(

                        session.userId

                    );








                    this.highlightSession(

                        div

                    );



                };








                this.sessions.appendChild(

                    div

                );



            }

        );









        /**
         * Session恢复完成
         *
         * 自动恢复当前客户
         */
        this.restoreCurrentSession();



    },









    highlightSession(item){



        document

        .querySelectorAll(

            ".session-item"

        )

        .forEach(

            el=>{


                el.style.border=

                "1px solid #eee";


            }

        );








        item.style.border=

        "2px solid #409eff";



    },









    renderOnlineUsers(){



        if(!this.onlineUsers){



            return;


        }








        this.onlineUsers.innerHTML="";








        MeridianAdminState.onlineUsers

        .forEach(

            user=>{



                const div =

                document.createElement(

                    "div"

                );








                div.innerHTML=

                `🟢 ${user.userId}`;








                this.onlineUsers.appendChild(

                    div

                );



            }

        );



    },









    renderOfflineUsers(){



        if(!this.offlineUsers){



            return;


        }








        this.offlineUsers.innerHTML="";








        MeridianAdminState.offlineUsers

        .forEach(

            user=>{



                const div =

                document.createElement(

                    "div"

                );








                div.innerHTML=

                `⚫ ${user.userId}`;








                this.offlineUsers.appendChild(

                    div

                );



            }

        );



    },









    bindSend(callback){



        if(this.sendButton){



            this.sendButton.onclick =

            callback;



        }








        if(this.input){



            this.input.addEventListener(

                "keydown",

                e=>{



                    if(e.key==="Enter"){



                        callback();



                    }



                }

            );



        }



    },









    getInputMessage(){



        return this.input

        ?

        this.input.value.trim()

        :

        "";



    },









    clearInput(){



        if(this.input){



            this.input.value="";

        }



    }





};