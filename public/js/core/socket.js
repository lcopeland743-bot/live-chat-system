window.MeridianSocket = {

    socket: null,


    connect() {

        const config = window.MeridianConfig;
        const EVENTS = window.MERIDIAN_EVENTS;


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


        this.socket = io(config.socket.url);


        this.socket.on("connect", () => {


            MeridianLogger.info(
                "Socket connected",
                {
                    id: this.socket.id
                }
            );


            this.socket.emit(
                EVENTS.USER_ENTER,
                {

                    userId: config.user.id,

                    page: config.user.page,

                    referrer: config.user.referrer,

                    socketId: this.socket.id,

                    time: MeridianTime.now()

                }
            );


        });



        this.socket.on("disconnect", () => {


            MeridianLogger.warn(
                "Socket disconnected"
            );


        });



        return this.socket;


    },



    sendMessage(message) {


        const EVENTS = window.MERIDIAN_EVENTS;


        if (!this.socket) {


            MeridianLogger.error(
                "Socket not connected"
            );


            return;

        }



        this.socket.emit(

            EVENTS.USER_MESSAGE,

            {

                userId: window.MeridianConfig.user.id,

                message: message,

                page: window.MeridianConfig.user.page,

                time: MeridianTime.now()

            }

        );


    },



    onAdminReply(callback) {


        const EVENTS = window.MERIDIAN_EVENTS;


        if (!this.socket) {

            return;

        }


        this.socket.on(

            EVENTS.ADMIN_REPLY,

            callback

        );


    }


};