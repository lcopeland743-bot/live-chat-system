/**
 * Meridian Admin History Loader
 *
 * MongoDB History Message Loader
 *
 * Version:
 * v2.1.2
 */

window.MeridianHistoryLoader = {


    async load(userId){


        if(!userId){


            console.warn(

                "History load failed: no userId"

            );


            return [];


        }


        try{


            const response =

            await fetch(

                `/api/messages/${encodeURIComponent(userId)}`,

                {


                    credentials:

                    "same-origin",


                    cache:

                    "no-store"


                }

            );


            if(

                window.MeridianAdminAuth

                &&

                window.MeridianAdminAuth

                .handleUnauthorizedResponse(

                    response

                )

            ){


                return [];


            }


            const result =

            await response.json();


            if(

                !response.ok

                ||

                !result.success

            ){


                console.error(

                    "History API failed",

                    result

                );


                return [];


            }


            const messages =

            result.messages

            ||

            [];


            console.log(

                "History messages loaded:",

                messages

            );


            return messages;


        }

        catch(error){


            console.error(

                "History load error:",

                error

            );


            return [];


        }


    }


};
