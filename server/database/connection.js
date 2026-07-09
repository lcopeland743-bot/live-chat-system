/**
 * Meridian Database Connection
 *
 * MongoDB Connection Manager
 *
 * Version:
 * v1.2.0
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








module.exports = {


    connectDatabase,


    getConnectionStatus


};