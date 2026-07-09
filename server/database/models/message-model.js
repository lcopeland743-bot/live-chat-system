/**
 * Meridian Message Model
 *
 * MongoDB Message Schema
 *
 * Version:
 * v1.2.0
 */



const mongoose =
require("mongoose");









const messageSchema =

new mongoose.Schema(


    {


        /**
         * 消息唯一ID
         */
        messageId:{


            type:String,


            required:true,


            unique:true,


            index:true


        },







        /**
         * 会话ID
         */
        sessionId:{


            type:String,


            required:true,


            index:true


        },







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
         * 发送者
         *
         * user
         * admin
         */
        sender:{


            type:String,


            enum:[

                "user",

                "admin"

            ],


            required:true


        },








        /**
         * 消息类型
         *
         * text
         * image
         * link
         * file
         */
        type:{


            type:String,


            default:"text"


        },







        /**
         * 消息内容
         */
        content:{


            type:String,


            default:""


        },








        /**
         * 消息时间
         */
        createdAt:{


            type:Date,


            default:Date.now


        }



    },


    {


        timestamps:true


    }


);









/**
 * 查询优化索引
 */
messageSchema.index({

    sessionId:1,

    createdAt:1

});









module.exports =

mongoose.model(

    "Message",

    messageSchema

);