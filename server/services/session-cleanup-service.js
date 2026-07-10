/**
 * Meridian Session Cleanup Service
 *
 * Version:
 * v2.0.0
 *
 * Features:
 * - Clear stale online sessions
 * - Server restart recovery
 */


const Session =
require("../database/models/session-model");







async function cleanupOnlineSessions(){



    try{



        const result =

        await Session.updateMany(


            {


                status:

                "online"


            },


            {


                status:

                "offline",


                lastSeen:

                new Date()


            }


        );







        console.log(

            "[Session Cleanup] Online sessions reset:",

            result.modifiedCount

        );







        return result;



    }

    catch(error){



        console.error(

            "[Session Cleanup Failed]",

            error

        );



        throw error;



    }



}







module.exports = {


    cleanupOnlineSessions


};