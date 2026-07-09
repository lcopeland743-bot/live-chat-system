/**
 * Meridian Session Model
 *
 * MongoDB Session Schema
 *
 * Version:
 * v1.2.0
 */


const mongoose =
require("mongoose");








const sessionSchema =

new mongoose.Schema(


    {



        /**
         * 用户ID
         */
        userId:{


            type:String,


            required:true,


            index:true


        },





        /**
         * Socket ID
         */
        socketId:{


            type:String,


            default:null


        },







        /**
         * 状态
         *
         * online
         * offline
         */
        status:{


            type:String,


            default:"online"


        },








        /**
         * 用户访问页面
         */
        page:{


            type:String,


            default:""


        },







        /**
         * 进入时间
         */
        connectedAt:{


            type:Date,


            default:Date.now


        },







        /**
         * 离线时间
         */
        lastSeen:{


            type:Date,


            default:null


        },







        /**
         * 最后一条消息
         */
        lastMessage:{


            type:String,


            default:""


        },







        /**
         * 消息总数量
         */
        messageCount:{


            type:Number,


            default:0


        },







        /**
         * 未读消息数量
         *
         * Phase 1.5
         * Unread Message System
         */
        unreadCount:{


            type:Number,


            default:0


        }



    },



    {


        timestamps:true


    }



);









/**
 * 创建索引
 */
sessionSchema.index({

    userId:1,

    status:1

});









module.exports =

mongoose.model(

    "Session",

    sessionSchema

);