/**
 * Meridian Session Service
 *
 * MongoDB Session Manager
 *
 * Version:
 * v1.2.1
 *
 * Features:
 * - Create Session
 * - Update Message
 * - Update Unread Count
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

            userId:
            data.userId


        },



        {


            userId:
            data.userId,


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


            lastSeen:
            null



        },



        {


            new:true,


            upsert:true


        }



    );





    return session;


}









/**
 * 更新消息
 */
async function updateMessage(

    userId,

    message

){



    const session =

    await Session.findOneAndUpdate(



        {

            userId:userId


        },



        {


            lastMessage:
            message,


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
 * 增加未读消息数量
 *
 * Phase 1.5
 * Unread Message System
 */
async function incrementUnread(

    userId

){



    const session =

    await Session.findOneAndUpdate(



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






    return session;


}









/**
 * 用户离线
 */
async function offline(

    userId,

    time

){



    const session =

    await Session.findOneAndUpdate(



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







    return session;


}









/**
 * 获取全部Session
 */
async function getSessions(){



    const sessions =

    await Session.find()

    .sort({

        updatedAt:-1

    });






    return sessions;


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


    offline,


    getSessions,


    getSessionByUserId


};