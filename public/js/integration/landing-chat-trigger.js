/**
 * Meridian Landing Chat Trigger
 *
 * Version:
 * v2.0.10
 *
 * Connect landing page buttons
 * to real Meridian Chat Window
 */


(function(){


    function init(){



        const buttons =

        document.querySelectorAll(

            "[data-question]"

        );





        if(!buttons.length){

            return;

        }






        buttons.forEach(

            button=>{


                button.addEventListener(

                    "click",

                    ()=>{


                        if(

                            window.MeridianChatUI

                        ){


                            MeridianChatUI.open();



                        }

                        else{


                            console.warn(

                                "MeridianChatUI not ready"

                            );


                        }



                    }

                );



            }

        );



    }






    if(

        document.readyState ===

        "loading"

    ){


        document.addEventListener(

            "DOMContentLoaded",

            init

        );


    }

    else{


        init();


    }



})();