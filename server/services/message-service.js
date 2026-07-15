/**
 * Meridian Message Service
 *
 * MongoDB Message Manager
 *
 * Version:
 * v2.2.0
 *
 * Features:
 * - Save Message
 * - Duplicate Check
 * - Query History
 * - Recent AI Context
 * - Rich Message Support
 * - Investor Choice Lookup
 */

const Message =
require("../database/models/message-model");


const recentMessages =
new Set();


const allowedTypes = [


    "text",


    "image",


    "link",


    "file",


    "link-card"


];


function isDuplicate(

    messageId

){


    if(

        recentMessages.has(

            messageId

        )

    ){


        return true;


    }


    recentMessages.add(

        messageId

    );


    const timer =

    setTimeout(

        ()=>{


            recentMessages.delete(

                messageId

            );


        },

        5 * 60 * 1000

    );


    timer.unref();


    return false;


}


function normalizeType(type){


    return allowedTypes.includes(type)

    ?

    type

    :

    "text";


}


async function saveMessage(data){


    return await Message.create({


        messageId:

        data.messageId,


        sessionId:

        data.sessionId

        ||

        data.userId,


        userId:

        data.userId,


        socketId:

        data.socketId

        ||

        null,


        sender:

        data.sender

        ||

        "user",


        type:

        normalizeType(

            data.type

            ||

            "text"

        ),


        content:

        data.content

        ||

        data.message

        ||

        "",


        metadata:

        data.metadata

        ||

        {},


        messageStatus:

        data.messageStatus

        ||

        "sent",


        createdAt:

        data.time

        ||

        new Date()


    });


}


async function getMessages(userId){


    return await Message.find({


        userId:

        userId


    })

    .sort({


        createdAt:1


    });


}


async function getSessionMessages(sessionId){


    return await Message.find({


        sessionId:

        sessionId


    })

    .sort({


        createdAt:1


    });


}


async function getRecentMessages(

    userId,

    limit=20

){


    const safeLimit =

    Math.min(

        Math.max(

            Number(limit)

            ||

            20,

            2

        ),

        50

    );


    const messages =

    await Message.find({


        userId:

        userId,


        type:"text",


        content:{


            $ne:""


        }


    })

    .sort({


        createdAt:-1


    })

    .limit(

        safeLimit

    )

    .lean();


    return messages.reverse();


}


async function hasInvestorProfileChoice(userId){


    const result =

    await Message.exists({


        userId:

        userId,


        sender:

        "user",


        "metadata.interaction":

        "investor-profile"


    });


    return Boolean(result);


}


module.exports = {


    isDuplicate,


    saveMessage,


    getMessages,


    getSessionMessages,


    getRecentMessages,


    hasInvestorProfileChoice


};
