/**
 * Meridian Admin Socket Authentication
 *
 * Version:
 * v2.1.2
 */

const ADMIN_ROOM =
"meridian_admins";


function configureAdminSocketAuth(io){


    io.use(

        (socket,next)=>{


            const requestedType =

            socket.handshake

            &&

            socket.handshake.auth

            ?

            socket.handshake.auth.clientType

            :

            "user";


            const clientType =

            requestedType === "admin"

            ?

            "admin"

            :

            "user";


            socket.data.clientType =

            clientType;


            socket.data.isAdmin =

            false;


            if(clientType !== "admin"){


                return next();


            }


            const session =

            socket.request

            &&

            socket.request.session

            ?

            socket.request.session

            :

            null;


            const admin =

            session

            &&

            session.admin

            ?

            session.admin

            :

            null;


            if(

                !admin

                ||

                admin.authenticated !== true

            ){


                const error =

                new Error(

                    "ADMIN_AUTH_REQUIRED"

                );


                error.data = {


                    code:

                    "ADMIN_AUTH_REQUIRED"


                };


                return next(error);


            }


            socket.data.isAdmin =

            true;


            socket.data.adminUsername =

            admin.username;


            return next();


        }

    );


}


function reloadSocketSession(socket){


    return new Promise(

        resolve=>{


            const session =

            socket.request

            &&

            socket.request.session

            ?

            socket.request.session

            :

            null;


            if(

                !session

                ||

                typeof session.reload !== "function"

            ){


                resolve(false);


                return;


            }


            session.reload(

                error=>{


                    if(error){


                        resolve(false);


                        return;


                    }


                    const admin =

                    session.admin;


                    resolve(

                        Boolean(

                            admin

                            &&

                            admin.authenticated === true

                        )

                    );


                }

            );


        }

    );


}


async function verifyAdminSocketSession(socket){


    if(

        !socket.data

        ||

        socket.data.isAdmin !== true

    ){


        return false;


    }


    const valid =

    await reloadSocketSession(

        socket

    );


    if(!valid){


        socket.data.isAdmin =

        false;


        socket.leave(

            ADMIN_ROOM

        );


    }


    return valid;


}


function joinAuthenticatedAdminRoom(socket){


    if(

        socket.data

        &&

        socket.data.isAdmin === true

    ){


        socket.join(

            ADMIN_ROOM

        );


        const validationTimer =

        setInterval(

            async()=>{


                const valid =

                await verifyAdminSocketSession(

                    socket

                );


                if(!valid){


                    clearInterval(

                        validationTimer

                    );


                    socket.emit(

                        "admin_auth_expired",

                        {


                            code:

                            "ADMIN_AUTH_REQUIRED"


                        }

                    );


                    socket.disconnect(true);


                }


            },

            5 * 60 * 1000

        );


        validationTimer.unref();


        socket.on(

            "disconnect",

            ()=>{


                clearInterval(

                    validationTimer

                );


            }

        );


    }


}


module.exports = {


    ADMIN_ROOM,


    configureAdminSocketAuth,


    joinAuthenticatedAdminRoom,


    verifyAdminSocketSession


};
