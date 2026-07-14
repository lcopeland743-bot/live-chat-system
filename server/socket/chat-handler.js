/**
 * Meridian Chat Handler
 *
 * Version:
 * v2.1.1
 *
 * Features:
 * - Rich Message Support
 * - Message ID
 * - Deduplication
 * - MongoDB Message Storage
 * - MongoDB Session Update
 * - Unread Message Counter
 * - Investor Profile Auto Reply
 */

const MeridianTime =
require("../utils/time");


const messageService =
require("../services/message-service");


const sessionService =
require("../services/session-service");


const briefingAutoReplyService =
require("../services/briefing-auto-reply-service");


const activeChoiceUsers =
new Set();


function createMessageId(){


    return (

        "msg_"

        +

        Date.now()

        +

        "_"

        +

        Math.random()

        .toString(36)

        .substring(2,8)

    );


}


function normalizeContent(data){


    return (

        data.content

        ||

        data.message

        ||

        ""

    );


}


function normalizeType(data){


    return (

        data.type

        ||

        "text"

    );


}


function createPayload(

    data,

    defaults={}

){


    const content =

    normalizeContent(data);



    return {


        messageId:

        data.messageId

        ||

        createMessageId(),


        userId:

        defaults.userId

        ||

        data.userId,


        sessionId:

        defaults.sessionId

        ||

        data.sessionId

        ||

        data.userId,


        socketId:

        defaults.socketId

        ||

        data.socketId

        ||

        null,


        message:

        content,


        content:

        content,


        type:

        normalizeType(data),


        metadata:

        data.metadata

        ||

        {},


        sender:

        defaults.sender

        ||

        data.sender

        ||

        "user",


        messageStatus:

        "sent",


        time:

        data.time

        ||

        MeridianTime.now()


    };


}


function emitSessionUpdate(

    io,

    session

){


    io.emit(

        "admin_session_update",

        {


            type:

            "update",


            session:

            session


        }

    );


}


function emitAdminConversationMessage(

    io,

    payload

){


    io.emit(

        "admin_user_message",

        payload

    );


}


async function saveAutomatedReply(

    io,

    targetSocketId,

    userId,

    message

){


    const payload =

    createPayload(

        {


            type:

            message.type,


            content:

            message.content,


            message:

            message.content,


            metadata:

            message.metadata,


            time:

            MeridianTime.now()


        },

        {


            userId:

            userId,


            sessionId:

            userId,


            socketId:

            targetSocketId,


            sender:

            "admin"


        }

    );



    await messageService.saveMessage(

        payload

    );



    const sessionPreview =

    payload.type === "link-card"

    ?

    (

        payload.metadata.title

        ||

        "Your briefing is ready."

    )

    :

    payload.content;



    const updatedSession =

    await sessionService.updateMessage(

        userId,

        sessionPreview,

        "admin"

    );



    emitSessionUpdate(

        io,

        updatedSession

    );



    io.to(

        targetSocketId

    )

    .emit(

        "admin_reply",

        payload

    );



    emitAdminConversationMessage(

        io,

        payload

    );



    console.log(

        "[Automated Reply Saved]",

        {


            messageId:

            payload.messageId,


            userId:

            payload.userId,


            type:

            payload.type,


            choiceId:

            payload.metadata.choiceId

        }

    );


}


async function sendBriefingAutoReply(

    io,

    targetSocketId,

    userId,

    choiceId

){


    const messages =

    briefingAutoReplyService

    .createAutoReplyMessages(

        choiceId

    );



    for(

        const message

        of

        messages

    ){


        await saveAutomatedReply(

            io,

            targetSocketId,

            userId,

            message

        );


    }


}


function registerChatHandler(

    io,

    socket

){


    /**
     * 用户发送消息
     */
    socket.on(

        "user_message",

        async(data)=>{


            let lockedChoiceUserId =

            null;



            try{


                const payload =

                createPayload(

                    data,

                    {


                        userId:

                        data.userId,


                        sessionId:

                        data.userId,


                        socketId:

                        socket.id,


                        sender:

                        "user"


                    }

                );



                if(

                    !payload.userId

                    ||

                    !payload.content

                ){


                    return;


                }



                if(

                    messageService.isDuplicate(

                        payload.messageId

                    )

                ){


                    return;


                }



                const choice =

                briefingAutoReplyService

                .getChoiceFromPayload(

                    payload

                );



                if(choice){


                    if(

                        activeChoiceUsers.has(

                            payload.userId

                        )

                    ){


                        return;


                    }



                    activeChoiceUsers.add(

                        payload.userId

                    );



                    lockedChoiceUserId =

                    payload.userId;



                    const alreadySelected =

                    await messageService

                    .hasInvestorProfileChoice(

                        payload.userId

                    );



                    if(alreadySelected){


                        return;


                    }


                }



                await messageService.saveMessage(

                    payload

                );



                await sessionService.updateMessage(

                    payload.userId,

                    payload.content,

                    "user"

                );



                const session =

                await sessionService.incrementUnread(

                    payload.userId

                );



                console.log(

                    "[Message Saved]",

                    payload

                );



                emitSessionUpdate(

                    io,

                    session

                );



                emitAdminConversationMessage(

                    io,

                    payload

                );



                if(choice){


                    await sendBriefingAutoReply(

                        io,

                        socket.id,

                        payload.userId,

                        choice.id

                    );


                }


            }

            catch(error){


                console.error(

                    "[User Message Error]",

                    error

                );


            }

            finally{


                if(lockedChoiceUserId){


                    activeChoiceUsers.delete(

                        lockedChoiceUserId

                    );


                }


            }


        }

    );


    /**
     * 客服回复
     */
    socket.on(

        "admin_reply",

        async(data)=>{


            try{


                if(

                    !data.socketId

                    ||

                    !(

                        data.message

                        ||

                        data.content

                    )

                ){


                    return;


                }



                const sessions =

                await sessionService.getSessions();



                const session =

                sessions.find(

                    item=>

                    item.socketId === data.socketId

                );



                if(!session){


                    return;


                }



                const payload =

                createPayload(

                    data,

                    {


                        userId:

                        session.userId,


                        sessionId:

                        session.userId,


                        socketId:

                        data.socketId,


                        sender:

                        "admin"


                    }

                );



                if(

                    messageService.isDuplicate(

                        payload.messageId

                    )

                ){


                    return;


                }



                await messageService.saveMessage(

                    payload

                );



                const updatedSession =

                await sessionService.updateMessage(

                    session.userId,

                    payload.content,

                    "admin"

                );



                emitSessionUpdate(

                    io,

                    updatedSession

                );



                console.log(

                    "Admin reply:",

                    payload

                );



                io.to(

                    data.socketId

                )

                .emit(

                    "admin_reply",

                    payload

                );



                socket.emit(

                    "admin_reply",

                    payload

                );


            }

            catch(error){


                console.error(

                    "[Admin Reply Error]",

                    error

                );


            }


        }

    );


}


module.exports =
registerChatHandler;
