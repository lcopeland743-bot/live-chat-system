/**
 * Meridian Admin Link Card
 *
 * Version:
 * v2.1.0
 *
 * 固定 WhatsApp 链接卡片发送模块
 */


window.MeridianAdminLinkCard = {


    config:{


        platform:"whatsapp",


        url:"https://wa.me/19342032173",


        avatar:"",


        title:"Your briefing is ready.",


        subtitle:"",


        buttonText:"Claim for free"


    },





    init(){


        this.button =

        document.getElementById(

            "adminWhatsAppCardBtn"

        );



        if(!this.button){

            return;

        }



        this.button.onclick = ()=>{


            this.send();


        };


    },





    createMessage(){


        if(

            !window.MeridianMessageAdapter

            ||

            typeof window.MeridianMessageAdapter
            .createLinkCardMessage !== "function"

        ){


            console.error(

                "MeridianMessageAdapter link-card not loaded"

            );


            return null;


        }



        return window.MeridianMessageAdapter
        .createLinkCardMessage(

            this.config

        );


    },





    normalizeOutgoingMessage(message){


        if(

            typeof message === "string"

            &&

            message.trim() === this.config.url

        ){


            return this.createMessage()

            ||

            message;


        }



        return message;


    },





    send(){


        if(

            !window.MeridianAdminSocket

            ||

            typeof window.MeridianAdminSocket
            .sendReply !== "function"

        ){


            console.error(

                "MeridianAdminSocket not loaded"

            );


            return;


        }



        const message =

        this.createMessage();



        if(!message){

            return;

        }



        window.MeridianAdminSocket
        .sendReply(

            message

        );


    }


};


window.MeridianAdminLinkCard.init();
