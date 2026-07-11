/**
 * Meridian Message Adapter
 *
 * Version:
 * v2.0.3
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


    }

};