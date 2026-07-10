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
     * 消息类型检测
     *
     * text
     * link
     * image
     */
    detectMessageType(message){



        if(

            typeof message !== "string"

        ){

            return "text";

        }






        const urlPattern =

        /^https?:\/\/.+/i;






        if(

            !urlPattern.test(message)

        ){

            return "text";

        }






        const imagePattern =

        /\.(jpg|jpeg|png|gif|webp|svg)$/i;






        if(

            imagePattern.test(message)

        ){

            return "image";

        }






        return "link";


    },









    sendMessage(message){



        const EVENTS =
        window.MERIDIAN_EVENTS;






        if(!this.socket){



            MeridianLogger.error(

                "Socket not connected"

            );



            return;


        }






        const type =

        this.detectMessageType(

            message

        );






        const payload = {


            userId:

            window.MeridianConfig.user.id,



            /**
             * 保留旧字段
             */
            message:

            message,



            /**
             * v2.0.2 新字段
             */
            type:

            type,



            content:

            message,



            metadata:{},



            page:

            window.MeridianConfig.user.page,



            time:

            MeridianTime.now()


        };







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



                const payload = {


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



                };






                callback(payload);



            }

        );



    }


};