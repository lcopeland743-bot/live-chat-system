/**
 * Meridian Login Rate Limit
 *
 * Version:
 * v2.1.2
 *
 * In-memory protection for the single-instance deployment.
 */

const WINDOW_MS =
15 * 60 * 1000;


const MAX_FAILURES =
5;


const attempts =
new Map();


function getKey(req){


    return (

        req.ip

        ||

        req.socket.remoteAddress

        ||

        "unknown"

    );


}


function cleanupExpired(){


    const now =

    Date.now();


    for(

        const [

            key,

            record

        ]

        of

        attempts

    ){


        if(

            now - record.firstFailureAt

            >= WINDOW_MS

        ){


            attempts.delete(key);


        }


    }


}


const cleanupTimer =

setInterval(

    cleanupExpired,

    5 * 60 * 1000

);


cleanupTimer.unref();


function getActiveRecord(req){


    const key =

    getKey(req);


    const record =

    attempts.get(key);


    if(!record){


        return null;


    }


    if(

        Date.now()

        -

        record.firstFailureAt

        >= WINDOW_MS

    ){


        attempts.delete(key);


        return null;


    }


    return record;


}


function loginRateLimit(

    req,

    res,

    next

){


    const record =

    getActiveRecord(req);


    if(

        !record

        ||

        record.failures < MAX_FAILURES

    ){


        return next();


    }


    const retryAfterMs =

    Math.max(

        1000,

        WINDOW_MS

        -

        (

            Date.now()

            -

            record.firstFailureAt

        )

    );


    const retryAfterSeconds =

    Math.ceil(

        retryAfterMs

        /

        1000

    );


    res.set(

        "Retry-After",

        String(retryAfterSeconds)

    );


    return res

    .status(429)

    .json({


        success:false,


        code:"LOGIN_RATE_LIMITED",


        message:

        "Too many login attempts. Please try again later.",


        retryAfterSeconds:

        retryAfterSeconds


    });


}


function recordFailedLogin(req){


    const key =

    getKey(req);


    const now =

    Date.now();


    const record =

    getActiveRecord(req);


    if(!record){


        attempts.set(

            key,

            {


                failures:1,


                firstFailureAt:now


            }

        );


        return;


    }


    record.failures += 1;


    attempts.set(

        key,

        record

    );


}


function clearLoginFailures(req){


    attempts.delete(

        getKey(req)

    );


}


module.exports = {


    loginRateLimit,


    recordFailedLogin,


    clearLoginFailures


};
