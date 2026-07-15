/**
 * Meridian Admin Authentication Service
 *
 * Version:
 * v2.1.2
 */

const crypto =
require("crypto");


const bcrypt =
require("bcryptjs");


function getConfiguredUsername(){


    return (

        process.env.ADMIN_USERNAME

        ||

        ""

    );


}


function getConfiguredPasswordHash(){


    return (

        process.env.ADMIN_PASSWORD_HASH

        ||

        ""

    );


}


function digest(value){


    return crypto

    .createHash("sha256")

    .update(

        String(value),

        "utf8"

    )

    .digest();


}


function safeStringEqual(

    left,

    right

){


    return crypto.timingSafeEqual(

        digest(left),

        digest(right)

    );


}


function assertConfigured(){


    const username =

    getConfiguredUsername();


    const passwordHash =

    getConfiguredPasswordHash();


    if(!username){


        throw new Error(

            "ADMIN_USERNAME is not configured"

        );


    }


    if(

        !passwordHash

        ||

        !passwordHash.startsWith("$2")

    ){


        throw new Error(

            "ADMIN_PASSWORD_HASH is missing or invalid"

        );


    }


    if(

        !process.env.SESSION_SECRET

        ||

        process.env.SESSION_SECRET.length < 32

    ){


        throw new Error(

            "SESSION_SECRET must contain at least 32 characters"

        );


    }


    return true;


}


async function validateCredentials(

    username,

    password

){


    assertConfigured();


    if(

        typeof username !== "string"

        ||

        typeof password !== "string"

        ||

        username.length < 1

        ||

        username.length > 128

        ||

        password.length < 1

        ||

        password.length > 256

    ){


        return false;


    }


    const usernameMatches =

    safeStringEqual(

        username,

        getConfiguredUsername()

    );


    const passwordMatches =

    await bcrypt.compare(

        password,

        getConfiguredPasswordHash()

    );


    return (

        usernameMatches

        &&

        passwordMatches

    );


}


function createSessionAdmin(username){


    return {


        authenticated:true,


        username:username,


        loginAt:

        new Date().toISOString()


    };


}


module.exports = {


    assertConfigured,


    validateCredentials,


    createSessionAdmin


};
