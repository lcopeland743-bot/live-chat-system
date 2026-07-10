/**
 * Meridian Agent Model
 *
 * Multi Agent Foundation
 *
 * Version:
 * v2.0.1
 *
 * Features:
 * - Customer Service Account Foundation
 * - Department Support
 * - Agent Status
 * - Role Foundation
 */


const mongoose =
require("mongoose");







const agentSchema = new mongoose.Schema(


{


    /**
     * 客服ID
     *
     * Future Login Identity
     */
    agentId:{


        type:String,


        required:true,


        unique:true,


        index:true


    },







    /**
     * 客服名称
     */
    name:{


        type:String,


        default:""


    },







    /**
     * 登录邮箱预留
     */
    email:{


        type:String,


        default:"",


        index:true


    },







    /**
     * 角色
     *
     * admin
     * manager
     * agent
     */
    role:{


        type:String,


        default:"agent"


    },







    /**
     * 在线状态
     *
     * online
     * offline
     * busy
     */
    status:{


        type:String,


        default:"offline"


    },







    /**
     * 所属部门
     */
    departmentId:{


        type:String,


        default:null


    },







    /**
     * 最后在线时间
     */
    lastSeen:{


        type:Date,


        default:null


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
 * 索引
 */
agentSchema.index({

    status:1

});




agentSchema.index({

    departmentId:1

});








module.exports = mongoose.model(

    "Agent",

    agentSchema

);