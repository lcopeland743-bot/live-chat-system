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







        if(!this.socket){



            MeridianLogger.error(

                "Socket not connected"

            );


            return;


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

                message.content

                ||

                "",



                content:

                message.content

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