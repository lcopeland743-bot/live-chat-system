/**
 * Meridian Message Service
 *
 * MongoDB Message Manager
 *
 * Version:
 * v1.2.0
 *
 * Features:
 * - Save Message
 * - Duplicate Check
 * - Query History
 */



const Message =
require("../database/models/message-model");







/**
 * 临时消息去重缓存
 *
 * 用于防止短时间重复提交
 *
 * 后续可迁移 Redis
 */
const recentMessages =
new Set();








/**
 * 判断重复消息
 */
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





    /**
     * 5分钟后释放
     */
    setTimeout(

        ()=>{


            recentMessages.delete(

                messageId

            );


        },


        5 * 60 * 1000


    );





    return false;


}









/**
 * 保存消息
 */
async function saveMessage(data){



    const message =

    await Message.create({



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
        data.type
        ||
        "text",




        content:
        data.content
        ||
        data.message
        ||
        "",



        createdAt:
        data.time
        ||
        new Date()



    });







    return message;


}









/**
 * 查询用户聊天记录
 */
async function getMessages(

    userId

){



    const messages =

    await Message.find({


        userId:userId


    })

    .sort({

        createdAt:1

    });







    return messages;


}









/**
 * 根据Session查询
 */
async function getSessionMessages(

    sessionId

){



    return await Message.find({


        sessionId:sessionId


    })

    .sort({

        createdAt:1

    });



}









module.exports = {


    isDuplicate,


    saveMessage,


    getMessages,


    getSessionMessages


};