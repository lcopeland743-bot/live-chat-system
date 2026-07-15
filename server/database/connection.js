/**
 * Meridian Database Connection
 *
 * MongoDB Connection Manager
 *
 * Version:
 * v2.3.2
 */


const mongoose =
require("mongoose");



const config =
require("../config/server-config");





let connected = false;








/**
 * 连接 MongoDB
 */
async function connectDatabase(){



    if(connected){


        return mongoose.connection;


    }






    try {



        await mongoose.connect(

            config.mongodb.uri,

            {

                serverSelectionTimeoutMS:
                5000

            }

        );






        connected = true;





        console.log(

            "MongoDB connected"

        );





        return mongoose.connection;



    }
    catch(error){



        console.error(

            "MongoDB connection failed:",

            error.message

        );




        process.exit(1);



    }



}








/**
 * 获取连接状态
 */
function getConnectionStatus(){



    return {

        connected:

        connected,


        state:

        mongoose.connection.readyState


    };



}











/**
 * Close MongoDB cleanly.
 */
async function disconnectDatabase(){


    if(

        mongoose.connection.readyState !== 0

    ){


        await mongoose.disconnect();


    }


    connected = false;


}


module.exports = {


    connectDatabase,


    disconnectDatabase,


    getConnectionStatus


};