/**
 * Meridian Message Service
 *
 * MongoDB Message Manager
 *
 * Version:
 * v2.0.2
 *
 * Features:
 * - Save Message
 * - Duplicate Check
 * - Query History
 * - Rich Message Support
 */



const Message =
require("../database/models/message-model");









/**
 * 临时消息去重缓存
 *
 * 后续可迁移 Redis
 */
const recentMessages =
new Set();









/**
 * 支持的消息类型
 */
const allowedTypes = [


    "text",


    "image",


    "link",


    "file"


];









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
     * 5分钟释放
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
 * 消息类型处理
 */
function normalizeType(

    type

){



    if(

        allowedTypes.includes(type)

    ){

        return type;

    }







    return "text";


}









/**
 * 保存消息
 */
async function saveMessage(data){



    const message =

    await Message.create({



        /**
         * 消息ID
         */
        messageId:

        data.messageId,







        /**
         * 会话ID
         */
        sessionId:

        data.sessionId

        ||

        data.userId,







        /**
         * 用户ID
         */
        userId:

        data.userId,







        /**
         * Socket
         */
        socketId:

        data.socketId

        ||

        null,







        /**
         * 发送者
         */
        sender:

        data.sender

        ||

        "user",







        /**
         * 消息类型
         */
        type:

        normalizeType(

            data.type

            ||

            "text"

        ),







        /**
         * 消息内容
         *
         * text:
         * 文字
         *
         * image:
         * 图片URL
         *
         * link:
         * 链接URL
         *
         * file:
         * 文件URL
         */
        content:

        data.content

        ||

        data.message

        ||

        "",







        /**
         * 扩展数据
         */
        metadata:

        data.metadata

        ||

        {},







        /**
         * 消息状态
         */
        messageStatus:

        data.messageStatus

        ||

        "sent",







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



    return await Message.find({


        userId:userId


    })

    .sort({

        createdAt:1

    });


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