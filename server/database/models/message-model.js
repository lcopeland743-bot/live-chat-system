/**
 * Meridian Message Model
 *
 * MongoDB Message Schema
 *
 * Version:
 * v2.1.0
 *
 * Features:
 * - Text Message
 * - Image Message
 * - Link Message
 * - File Message
 * - Link Card Message
 * - Message Metadata
 * - Message Status
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
         * link-card
         */
        type:{

            type:String,

            enum:[

                "text",

                "image",

                "link",

                "file",

                "link-card"

            ],

            default:"text"

        },

        /**
         * 消息内容
         *
         * text:
         * 普通文字
         *
         * image:
         * 图片URL
         *
         * link:
         * 网页URL
         *
         * file:
         * 文件URL
         *
         * link-card:
         * 卡片目标链接URL
         */
        content:{

            type:String,

            default:""

        },

        /**
         * 扩展数据
         *
         * 图片:
         * {
         * width,
         * height,
         * size
         * }
         *
         * 普通链接:
         * {
         * title,
         * preview
         * }
         *
         * 链接卡片:
         * {
         * platform,
         * avatar,
         * title,
         * subtitle,
         * buttonText
         * }
         */
        metadata:{

            type:Object,

            default:()=>({})

        },

        /**
         * 消息状态
         *
         * sent
         * delivered
         * read
         */
        messageStatus:{

            type:String,

            enum:[

                "sent",

                "delivered",

                "read"

            ],

            default:"sent"

        },

        /**
         * 创建时间
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

/**
 * 类型查询优化
 */
messageSchema.index({

    type:1

});

module.exports =

mongoose.model(

    "Message",

    messageSchema

);