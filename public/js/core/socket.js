window.MeridianSocket = {


    socket: null,





    connect() {


        const config =
        window.MeridianConfig;


        const EVENTS =
        window.MERIDIAN_EVENTS;





        if (!window.io) {


            MeridianLogger.error(
                "Socket.io not loaded"
            );


            return null;


        }






        if (!EVENTS) {


            MeridianLogger.error(
                "MERIDIAN_EVENTS not loaded"
            );


            return null;


        }






        this.socket = io(
            config.socket.url
        );







        this.socket.on(

            "connect",

            ()=>{


                MeridianLogger.info(

                    "Socket connected",

                    {

                        id:this.socket.id

                    }

                );







                this.socket.emit(

                    EVENTS.USER_ENTER,

                    {


                        userId:

                        config.user.id,



                        page:

                        config.user.page,



                        referrer:

                        config.user.referrer,



                        socketId:

                        this.socket.id,



                        time:

                        MeridianTime.now()


                    }

                );



            }

        );








        this.socket.on(

            "disconnect",

            ()=>{


                MeridianLogger.warn(

                    "Socket disconnected"

                );


            }

        );







        return this.socket;


    },









    /**
     * 判断消息类型
     */
    detectMessageType(message){



        if(

            typeof message !== "string"

        ){


            return (

                message.type

                ||

                "text"

            );


        }







        if(

            /^https?:\/\/.+/i.test(message)

        ){



            if(

                /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(message)

            ){


                return "image";


            }



            return "link";


        }







        return "text";


    },









    /**
     * 发送消息
     *
     * 支持:
     *
     * string
     *
     * object
     */
    sendMessage(message){



        const EVENTS =

        window.MERIDIAN_EVENTS;







        if(

            !this.socket

            ||

            !this.socket.connected

        ){



            MeridianLogger.error(

                "Socket not connected"

            );


            return false;


        }







        let payload;








        /**
         * Object Message
         *
         * image/link/text
         */
        if(

            typeof message === "object"

        ){



            payload = {



                userId:

                window.MeridianConfig.user.id,



                message:

                message.message

                ||

                message.content

                ||

                "",



                content:

                message.content

                ||

                message.message

                ||

                "",



                type:

                message.type

                ||

                "text",



                metadata:

                message.metadata

                ||

                {},



                page:

                window.MeridianConfig.user.page,



                time:

                MeridianTime.now()



            };



        }







        /**
         * Legacy String Message
         */
        else{



            const type =

            this.detectMessageType(

                message

            );






            payload = {



                userId:

                window.MeridianConfig.user.id,



                message:

                message,



                content:

                message,



                type:type,



                metadata:{},



                page:

                window.MeridianConfig.user.page,



                time:

                MeridianTime.now()



            };


        }







        this.socket.emit(

            EVENTS.USER_MESSAGE,

            payload

        );



        return true;



    },









    /**
     * 发送投资者类型选择
     */
    sendInvestorChoice(

        choiceId,

        choiceLabel

    ){



        const allowedChoices = {


            "long-term-investor":

            "Long-term Investor",


            "short-term-trader":

            "Short-term Trader",


            "just-exploring":

            "Just Exploring"


        };



        if(

            !allowedChoices[choiceId]

            ||

            allowedChoices[choiceId]

            !== choiceLabel

        ){


            MeridianLogger.error(

                "Invalid investor choice"

            );


            return false;


        }



        return this.sendMessage({


            type:"text",


            content:choiceLabel,


            message:choiceLabel,


            metadata:{


                interaction:

                "investor-profile",


                choiceId:

                choiceId,


                choiceLabel:

                choiceLabel


            }


        });



    },









    onAdminReply(callback){



        const EVENTS =

        window.MERIDIAN_EVENTS;







        if(!this.socket){


            return;


        }







        this.socket.on(

            EVENTS.ADMIN_REPLY,

            (data)=>{



                callback({



                    type:

                    data.type

                    ||

                    "text",



                    content:

                    data.content

                    ||

                    data.message

                    ||

                    "",



                    message:

                    data.message

                    ||

                    data.content

                    ||

                    "",



                    metadata:

                    data.metadata

                    ||

                    {}



                });



            }

        );



    }


};