/**
 * Meridian Message Service
 *
 * 消息去重服务
 *
 * Version: v1.1.0
 */


class MessageService {



    constructor(){


        /**
         * 已处理消息ID缓存
         *
         * Map:
         *
         * messageId
         * timestamp
         */
        this.messages = new Map();



        /**
         * 最大保存数量
         */
        this.maxSize = 1000;



    }






    /**
     * 检查消息是否重复
     *
     * true:
     * 已存在
     *
     * false:
     * 新消息
     */
    isDuplicate(
        messageId
    ){


        if(
            this.messages.has(
                messageId
            )
        ){

            return true;

        }



        this.messages.set(

            messageId,

            Date.now()

        );



        this.cleanup();



        return false;


    }





    /**
     * 清理旧消息
     */
    cleanup(){



        if(
            this.messages.size
            <=
            this.maxSize
        ){

            return;

        }




        const firstKey =
        this.messages.keys()
        .next()
        .value;



        this.messages.delete(
            firstKey
        );



    }




    /**
     * 当前缓存数量
     */
    count(){


        return this.messages.size;


    }


}



module.exports =
new MessageService();