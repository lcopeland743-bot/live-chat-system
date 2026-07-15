/**
 * Meridian Message Model
 *
 * MongoDB Message Schema
 *
 * Version:
 * v2.3.2
 *
 * Features:
 * - User Message
 * - Admin Message
 * - AI Message
 * - Rich Message Types
 * - Message Metadata
 * - Message Status
 */

const mongoose =
require("mongoose");


const dataRetentionConfig =
require("../../config/data-retention-config");


const messageSchema =

new mongoose.Schema(

    {


        messageId:{


            type:String,


            required:true,


            unique:true,


            index:true


        },


        sessionId:{


            type:String,


            required:true,


            index:true


        },


        userId:{


            type:String,


            required:true,


            index:true


        },


        socketId:{


            type:String,


            default:null


        },


        sender:{


            type:String,


            enum:[


                "user",


                "admin",


                "ai"


            ],


            required:true


        },


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


        content:{


            type:String,


            default:""


        },


        metadata:{


            type:Object,


            default:()=>({})


        },


        messageStatus:{


            type:String,


            enum:[


                "sent",


                "delivered",


                "read"


            ],


            default:"sent"


        },


        expiresAt:{


            type:Date,


            default:()=>{


                return dataRetentionConfig

                .calculateMessageExpiry(

                    new Date()

                );


            }


        },


        createdAt:{


            type:Date,


            default:Date.now


        }


    },

    {


        timestamps:true


    }

);


messageSchema.index({


    sessionId:1,


    createdAt:1


});


messageSchema.index({


    type:1


});


messageSchema.index({


    userId:1,


    sender:1,


    createdAt:-1


});


messageSchema.index(
    {


        expiresAt:1


    },
    {


        expireAfterSeconds:0,


        name:"message_expiry_ttl"


    }
);


module.exports =

mongoose.model(

    "Message",

    messageSchema

);
