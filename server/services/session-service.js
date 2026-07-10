/**
 * Meridian Session Service
 *
 * MongoDB Conversation Manager
 *
 * Version:
 * v2.0.0
 *
 * Features:
 * - Create Conversation
 * - Update Message Metadata
 * - Unread Management
 * - Agent Assignment Foundation
 * - Conversation Status
 * - Offline Session
 * - Query Sessions
 */


const Session =
require("../database/models/session-model");





/**
 * 创建 Session
 */
async function createSession(data){


    const session =

    await Session.findOneAndUpdate(


        {

            userId:data.userId

        },


        {


            userId:data.userId,


            customerId:
            data.customerId
            ||
            null,


            socketId:
            data.socketId
            ||
            null,


            status:
            "online",


            page:
            data.page
            ||
            "",


            connectedAt:
            data.time
            ||
            new Date(),


            lastSeen:null,


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
 * 更新最后消息
 *
 * sender:
 *
 * user
 * admin
 */
async function updateMessage(

    userId,

    message,

    sender="user"

){



    const session =

    await Session.findOneAndUpdate(


        {


            userId:userId

        },


        {


            lastMessage:
            message,


            lastMessageAt:
            new Date(),


            lastSender:
            sender,


            $inc:{


                messageCount:1


            }



        },


        {


            new:true,


            upsert:true


        }


    );



    return session;


}









/**
 * 增加未读数量
 */
async function incrementUnread(

    userId

){



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









/**
 * 清除未读
 */
async function clearUnread(

    userId

){



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
 *
 * Multi Agent Foundation
 */
async function assignAgent(

    userId,

    agentId,

    agentName

){



    return await Session.findOneAndUpdate(


        {


            userId:userId

        },


        {


            assignedAgentId:
            agentId,


            assignedAgentName:
            agentName
            ||
            "",


            conversationStatus:
            "assigned"


        },


        {


            new:true


        }


    );


}









/**
 * 关闭会话
 */
async function closeConversation(

    userId

){



    return await Session.findOneAndUpdate(


        {


            userId:userId

        },


        {


            conversationStatus:
            "closed"


        },


        {


            new:true


        }


    );


}









/**
 * 用户离线
 */
async function offline(

    userId,

    time

){



    return await Session.findOneAndUpdate(


        {


            userId:userId

        },


        {


            status:
            "offline",


            lastSeen:
            time
            ||
            new Date()


        },


        {


            new:true


        }


    );


}









/**
 * 获取全部会话
 *
 * 最新活动排序
 */
async function getSessions(){



    return await Session.find()

    .sort({


        updatedAt:-1


    });



}









/**
 * 根据用户查询
 */
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


    closeConversation,


    offline,


    getSessions,


    getSessionByUserId


};