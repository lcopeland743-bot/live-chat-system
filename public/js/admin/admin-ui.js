/**
 * Meridian Admin UI
 *
 * 企业会话工作台
 *
 * Version:
 * v2.1.0
 *
 * Features:
 * - All Conversations
 * - Session Management
 * - History Recovery
 * - Conversation Switching
 * - Multi Agent Foundation
 * - Rich Message Renderer
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



        this.input =

        document.getElementById(

            "adminReplyInput"

        );



        this.sendButton =

        document.getElementById(

            "adminSendBtn"

        );



    },









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



        if(!window.MeridianHistoryLoader){

            return;

        }





        if(this.historyLoaded[userId]){

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

                            messageId:

                            msg.messageId,



                            message:

                            msg.content,



                            content:

                            msg.content,



                            metadata:

                            msg.metadata || {},



                            sender:

                            msg.sender,



                            messageType:

                            msg.type || "text",



                            time:

                            msg.createdAt


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





                div.className =

                "message "

                +

                (

                    msg.sender==="admin"

                    ?

                    "admin"

                    :

                    "user"

                );





                const content =

                document.createElement(

                    "div"

                );





                content.className =

                "message-content";





                this.renderMessage(

                    content,

                    msg

                );





                const time =

                document.createElement(

                    "small"

                );



                time.textContent =

                msg.time || "";





                div.appendChild(

                    content

                );





                div.appendChild(

                    time

                );





                this.messages.appendChild(

                    div

                );



            }

        );





        this.messages.scrollTop =

        this.messages.scrollHeight;



    },









    /**
     * Rich Message Renderer
     *
     * 支持:
     *
     * text
     * link
     * image
     * file
     */
    renderMessage(

        container,

        msg

    ){



        const type =

        msg.messageType

        ||

        msg.type

        ||

        "text";





        const content =

        msg.message

        ||

        msg.content

        ||

        "";



        const metadata =

        msg.metadata

        ||

        {};









        if(type==="link-card"){


            this.renderLinkCard(

                container,

                {

                    content:content,

                    message:content,

                    metadata:metadata

                }

            );


            return;


        }








        if(type==="link"){



            const a =

            document.createElement(

                "a"

            );



            a.href = content;



            a.target = "_blank";



            a.rel =

            "noopener noreferrer";



            a.textContent = content;



            a.style.cursor =

            "pointer";



            a.style.textDecoration =

            "underline";



            container.appendChild(

                a

            );



            return;


        }









        if(type==="image"){



            const img =

            document.createElement(

                "img"

            );



            img.src = content;



            img.style.maxWidth =

            "300px";



            img.style.cursor =

            "pointer";



            img.onclick = ()=>{


                window.open(

                    content,

                    "_blank"

                );


            };



            container.appendChild(

                img

            );



            return;


        }









        if(type==="file"){



            const a =

            document.createElement(

                "a"

            );



            a.href = content;



            a.target="_blank";



            a.textContent =

            "📎 文件";



            container.appendChild(

                a

            );



            return;


        }









        container.textContent = content;



    },








    getSafeUrl(value){


        if(!value){

            return "";

        }



        try{


            const url =
            new URL(

                value,

                window.location.origin

            );



            if(

                url.protocol!=="http:"

                &&

                url.protocol!=="https:"

            ){

                return "";

            }



            return url.href;


        }

        catch(error){


            return "";


        }


    },





    ensureLinkBubbleStyles(){


        if(

            document.getElementById(

                "meridianAdminWhatsAppBubbleStyles"

            )

        ){

            return;

        }



        const style =

        document.createElement("style");



        style.id =

        "meridianAdminWhatsAppBubbleStyles";



        style.textContent = `

            .meridian-briefing-card{

                width:215px;

                display:flex;

                flex-direction:column;

                align-items:stretch;

                gap:10px;

            }


            .meridian-briefing-message{

                color:#111827;

                font-size:14px;

                font-weight:600;

                line-height:1.45;

            }


            .meridian-whatsapp-bubble{

                position:relative;

                min-height:56px;

                display:flex;

                align-items:center;

                justify-content:center;

                padding:13px 20px;

                border-radius:19px 19px 19px 6px;

                background:#25d366;

                color:#ffffff !important;

                text-decoration:none !important;

                text-align:center;

                font-size:15px;

                font-weight:700;

                line-height:1.3;

                box-shadow:0 7px 18px rgba(37,211,102,.30);

                cursor:pointer;

                transition:transform .15s ease, box-shadow .15s ease;

            }


            .meridian-whatsapp-bubble::after{

                content:"";

                position:absolute;

                left:0;

                bottom:-6px;

                width:15px;

                height:15px;

                background:#25d366;

                clip-path:polygon(0 0,100% 0,0 100%);

            }


            .meridian-whatsapp-bubble:hover{

                transform:translateY(-1px);

                box-shadow:0 10px 22px rgba(37,211,102,.38);

            }


            .meridian-whatsapp-bubble:focus-visible{

                outline:3px solid rgba(37,211,102,.32);

                outline-offset:3px;

            }

        `;



        document.head.appendChild(style);


    },





    renderLinkCard(

        container,

        message

    ){


        const metadata =

        message.metadata || {};



        const url =

        this.getSafeUrl(

            metadata.url

            ||

            message.content

            ||

            message.message

            ||

            ""

        );



        if(!url){


            container.textContent =

            message.content

            ||

            message.message

            ||

            "Link unavailable";


            return;


        }



        this.ensureLinkBubbleStyles();



        const wrapper =

        document.createElement("div");



        wrapper.className =

        "meridian-briefing-card";



        const intro =

        document.createElement("div");



        intro.className =

        "meridian-briefing-message";



        intro.textContent =

        metadata.title

        ||

        "Your briefing is ready.";



        const bubble =

        document.createElement("a");



        bubble.className =

        "meridian-whatsapp-bubble";



        bubble.href = url;



        bubble.target = "_blank";



        bubble.rel =

        "noopener noreferrer";



        bubble.setAttribute(

            "aria-label",

            metadata.buttonText

            ||

            "Claim for free"

        );



        bubble.textContent =

        metadata.buttonText

        ||

        "Claim for free";



        wrapper.appendChild(intro);



        wrapper.appendChild(bubble);



        container.appendChild(wrapper);


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





                div.className=

                "session-item";





                div.style.cursor=

                "pointer";





                const statusIcon =

                session.status==="online"

                ?

                "🟢"

                :

                "⚫";





                const time =

                session.lastMessageAt

                ?

                new Date(

                    session.lastMessageAt

                )

                .toLocaleString()

                :

                "";





                const unread =

                session.unreadCount > 0

                ?

                `

                <span>

                🔴${session.unreadCount}

                </span>

                `

                :

                "";





                div.innerHTML=

                `

                <div>

                <b>

                ${statusIcon}

                ${session.userId}

                </b>

                </div>


                <div>

                ${session.lastMessage || "暂无消息"}

                </div>


                <small>

                ${time}

                ${unread}

                </small>


                `;





                div.onclick=

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









    bindSend(callback){



        if(this.sendButton){



            this.sendButton.onclick=

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