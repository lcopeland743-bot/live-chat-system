/**
 * Meridian Conversation Store
 *
 * 后台多会话聊天缓存
 *
 * Version: v1.1.1
 *
 * Features:
 * - Multiple Conversations
 * - Independent Messages
 * - Conversation Switching
 * - Message Deduplication
 */



window.MeridianConversationStore = {



    /**
     * 所有会话
     *
     * {
     *   userId:{
     *      userId,
     *      messages:[]
     *   }
     * }
     */
    conversations:{},








    /**
     * 创建会话
     */
    createConversation(session){



        const userId =
        session.userId;



        if(
            !this.conversations[userId]
        ){


            this.conversations[userId] = {


                userId:userId,


                socketId:
                session.socketId
                ||
                null,


                status:
                session.status
                ||
                "online",



                messages:[]



            };


        }
        else{


            Object.assign(

                this.conversations[userId],

                session

            );


        }



        return this.conversations[userId];


    },









    /**
     * 获取会话
     */
    getConversation(userId){


        return this.conversations[userId];


    },









    /**
     * 添加消息
     *
     * 支持 messageId 去重
     */
    addMessage(
        userId,
        message
    ){



        const conversation =
        this.createConversation({

            userId:userId

        });








        /**
         * 消息去重
         *
         * 防止：
         * history-loader
         * +
         * realtime socket
         *
         * 重复加入
         */
        if(

            message.messageId

            &&

            conversation.messages.some(

                item =>

                item.messageId === message.messageId

            )

        ){


            return conversation;


        }








        conversation.messages.push(

            message

        );



        return conversation;


    },









    /**
     * 获取消息列表
     */
    getMessages(userId){



        const conversation =
        this.getConversation(
            userId
        );



        if(!conversation){

            return [];

        }



        return conversation.messages;


    },









    /**
     * 更新Socket
     */
    updateSession(session){



        const conversation =
        this.createConversation(
            session
        );



        Object.assign(

            conversation,

            session

        );



        return conversation;


    },









    /**
     * 获取全部会话
     */
    getAll(){


        return Object.values(

            this.conversations

        );


    }



};