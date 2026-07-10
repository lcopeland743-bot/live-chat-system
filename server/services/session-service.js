/**
 * Meridian Session Service
 *
 * MongoDB Conversation Manager
 *
 * Version:
 * v2.0.1
 *
 * Features:
 * - Conversation Management
 * - Message Metadata
 * - Unread Support
 * - Multi Agent Foundation
 */


const Session =
require("../database/models/session-model");









async function createSession(data){


    const session =

    await Session.findOneAndUpdate(

        {

            userId:data.userId

        },


        {

            userId:data.userId,


            customerId:
            data.customerId || null,


            socketId:
            data.socketId || null,


            status:"online",


            page:
            data.page || "",


            connectedAt:
            data.time || new Date(),


            conversationStatus:
            "unassigned"


        },


        {

            new:true,

            upsert:true

        }

    );


    return session;

}









/**
 * 更新消息信息
 */
async function updateMessage(

    userId,

    message,

    sender="user"

){


    return await Session.findOneAndUpdate(

        {

            userId:userId

        },


        {

            lastMessage:message,


            lastMessageAt:new Date(),


            lastSender:sender,


            $inc:{

                messageCount:1

            }

        },


        {

            new:true,

            upsert:true

        }

    );

}









async function incrementUnread(userId){


    return await Session.findOneAndUpdate(

        {

            userId:userId

        },


        {

            $inc:{

                unreadCount:1

            }

        },


        {

            new:true

        }

    );

}









async function clearUnread(userId){


    return await Session.findOneAndUpdate(

        {

            userId:userId

        },


        {

            unreadCount:0

        },


        {

            new:true

        }

    );

}









/**
 * 分配客服
 */
async function assignAgent(

    userId,

    agentId,

    agentName=""

){


    return await Session.findOneAndUpdate(

        {

            userId:userId

        },


        {

            assignedAgentId:agentId,


            assignedAgentName:agentName,


            conversationStatus:"assigned"

        },


        {

            new:true

        }

    );

}









/**
 * 释放客服
 */
async function releaseAgent(

    userId

){


    return await Session.findOneAndUpdate(

        {

            userId:userId

        },


        {

            assignedAgentId:null,


            assignedAgentName:"",


            conversationStatus:"unassigned"

        },


        {

            new:true

        }

    );

}









/**
 * 获取客服负责的客户
 */
async function getAgentSessions(

    agentId

){


    return await Session.find({

        assignedAgentId:agentId

    })

    .sort({

        updatedAt:-1

    });


}









async function offline(

    userId,

    time

){


    return await Session.findOneAndUpdate(

        {

            userId:userId

        },


        {

            status:"offline",


            lastSeen:

            time || new Date()

        },


        {

            new:true

        }

    );

}









async function closeConversation(

    userId

){


    return await Session.findOneAndUpdate(

        {

            userId:userId

        },


        {

            conversationStatus:"closed"

        },


        {

            new:true

        }

    );

}









async function getSessions(){


    return await Session.find()

    .sort({

        updatedAt:-1

    });


}









async function getSessionByUserId(

    userId

){


    return await Session.findOne({

        userId:userId

    });


}









module.exports = {


    createSession,


    updateMessage,


    incrementUnread,


    clearUnread,


    assignAgent,


    releaseAgent,


    getAgentSessions,


    offline,


    closeConversation,


    getSessions,


    getSessionByUserId


};