/**
 * Meridian Admin Bootstrap
 *
 * Version:
 * v2.3.6
 */

(function(){


    async function initAdmin(){


        if(

            !window.MeridianAdminAuth

        ){


            console.error(

                "MeridianAdminAuth not loaded"

            );


            return;


        }


        const authenticated =

        await window.MeridianAdminAuth

        .requireAuthenticated();


        if(!authenticated){


            return;


        }


        window.MeridianAdminState.init();


        window.MeridianAdminUI.init();


        if(

            window.MeridianAdminAI

        ){


            window.MeridianAdminAI.init();


        }


        window.MeridianAdminSocket.init();


        if(

            window.MeridianAdminUpload

        ){


            window.MeridianAdminUpload.init();


        }


        window.MeridianAdminUI.bindSend(

            ()=>{


                const message =

                window.MeridianAdminUI

                .getInputMessage();


                if(!message){


                    return;


                }


                window.MeridianAdminSocket

                .sendReply(

                    message

                );


                window.MeridianAdminUI

                .clearInput();


            }

        );


        console.log(

            "Meridian Admin v2.3.6 initialized"

        );


    }


    if(

        document.readyState === "loading"

    ){


        document.addEventListener(

            "DOMContentLoaded",

            initAdmin

        );


    }

    else{


        initAdmin();


    }


})();
