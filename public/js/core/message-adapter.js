/**
 * Meridian Message Adapter
 *
 * Version:
 * v2.1.0
 *
 * Unified Message Format
 */


window.MeridianMessageAdapter = {


    createTextMessage(message){


        return {


            type:"text",


            content:message,


            message:message,


            metadata:{}


        };


    },





    createLinkMessage(url){


        return {


            type:"link",


            content:url,


            message:url,


            metadata:{}


        };


    },





    createImageMessage(url){


        return {


            type:"image",


            content:url,


            message:url,


            metadata:{}


        };


    },





    /**
     * 创建通用链接卡片消息
     *
     * options:
     * - platform
     * - avatar
     * - title
     * - subtitle
     * - url
     * - buttonText
     */
    createLinkCardMessage(options={}){


        const url =
        String(options.url || "").trim();



        return {


            type:"link-card",


            content:url,


            message:url,


            metadata:{


                platform:
                String(options.platform || "link"),


                avatar:
                String(options.avatar || ""),


                title:
                String(options.title || "打开链接"),


                subtitle:
                String(options.subtitle || ""),


                url:url,


                buttonText:
                String(options.buttonText || "打开")


            }


        };


    }


};
