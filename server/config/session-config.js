/**
 * Meridian Admin Session Configuration
 *
 * Version:
 * v2.1.2
 */

const session =
require("express-session");


const {
    MongoStore
}
=
require("connect-mongo");


const serverConfig =
require("./server-config");


const COOKIE_NAME =
"meridian_admin_sid";


function parseSessionHours(){


    const value =

    Number(

        process.env.SESSION_MAX_AGE_HOURS

        ||

        12

    );


    if(

        !Number.isFinite(value)

        ||

        value < 1

        ||

        value > 168

    ){


        return 12;


    }


    return value;


}


function isProduction(){


    return (

        process.env.NODE_ENV === "production"

    );


}


function getCookieOptions(){


    const maxAge =

    parseSessionHours()

    *

    60

    *

    60

    *

    1000;


    return {


        httpOnly:true,


        secure:isProduction(),


        sameSite:"lax",


        maxAge:maxAge,


        path:"/"


    };


}


function validateSessionSecret(){


    const secret =

    process.env.SESSION_SECRET

    ||

    "";


    if(secret.length < 32){


        throw new Error(

            "SESSION_SECRET must contain at least 32 characters"

        );


    }


    return secret;


}


function createSessionMiddleware(){


    const secret =

    validateSessionSecret();


    const cookieOptions =

    getCookieOptions();


    const ttlSeconds =

    Math.floor(

        cookieOptions.maxAge

        /

        1000

    );


    return session({


        name:COOKIE_NAME,


        secret:secret,


        resave:false,


        saveUninitialized:false,


        rolling:true,


        proxy:isProduction(),


        store:

        MongoStore.create({


            mongoUrl:

            serverConfig.mongodb.uri,


            collectionName:

            "admin_sessions",


            ttl:

            ttlSeconds,


            autoRemove:

            "native",


            touchAfter:

            5 * 60,


            timestamps:true


        }),


        cookie:

        cookieOptions


    });


}


module.exports = {


    COOKIE_NAME,


    createSessionMiddleware,


    getCookieOptions,


    isProduction


};
