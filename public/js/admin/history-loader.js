/**
 * Meridian Admin History Loader
 *
 * MongoDB History Message Loader
 *
 * Version:
 * v1.2.1
 */





window.MeridianHistoryLoader = {



    /**
     * 加载用户历史消息
     */
    async load(userId){





        if(!userId){


            console.warn(

                "History load failed: no userId"

            );


            return [];

        }







        try {



            const response =

            await fetch(

                `/api/messages/${userId}`

            );








            const result =

            await response.json();







            if(

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