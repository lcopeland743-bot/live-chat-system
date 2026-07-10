/**
 * Meridian Session Model
 *
 * MongoDB Conversation Schema
 *
 * Version:
 * v2.0.0
 *
 * Features:
 * - Enterprise Conversation
 * - Multi Agent Foundation
 * - Unread Support
 * - Conversation Management
 */


const mongoose = require("mongoose");




const sessionSchema = new mongoose.Schema(


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
     * 客户ID
     *
     * Future Customer System
     */
    customerId:{


        type:String,


        default:null,


        index:true


    },







    /**
     * 当前Socket
     */
    socketId:{


        type:String,


        default:null


    },







    /**
     * 在线状态
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
     * 首次进入时间
     */
    connectedAt:{


        type:Date,


        default:Date.now


    },







    /**
     * 最后在线时间
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
     * 最后一条消息时间
     */
    lastMessageAt:{


        type:Date,


        default:null


    },







    /**
     * 最后发送者
     *
     * user
     * admin
     */
    lastSender:{


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
     * 未读数量
     */
    unreadCount:{


        type:Number,


        default:0


    },







    /**
     * 当前客服ID
     */
    assignedAgentId:{


        type:String,


        default:null


    },







    /**
     * 当前客服名称
     */
    assignedAgentName:{


        type:String,


        default:""


    },







    /**
     * 客服部门
     */
    departmentId:{


        type:String,


        default:null


    },







    /**
     * 会话状态
     *
     * unassigned
     * assigned
     * processing
     * closed
     */
    conversationStatus:{


        type:String,


        default:"unassigned"


    },







    /**
     * 优先级
     *
     * low
     * normal
     * high
     * vip
     */
    priority:{


        type:String,


        default:"normal"


    },







    /**
     * 标签
     */
    tags:[


        String


    ]



},


{


    timestamps:true


}



);







/**
 * 索引
 */
sessionSchema.index({

    userId:1,

    status:1

});




sessionSchema.index({

    updatedAt:-1

});




sessionSchema.index({

    assignedAgentId:1

});








module.exports = mongoose.model(

    "Session",

    sessionSchema

);