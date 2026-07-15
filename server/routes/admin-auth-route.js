/**
 * Meridian Admin Authentication Routes
 *
 * Version:
 * v2.1.2
 */

const express =
require("express");


const router =
express.Router();


const adminAuthService =
require("../services/admin-auth-service");


const {
    isAdminAuthenticated,
    setNoStore
}
=
require("../middleware/admin-auth-middleware");


const {
    loginRateLimit,
    recordFailedLogin,
    clearLoginFailures
}
=
require("../middleware/login-rate-limit");


const {
    COOKIE_NAME,
    getCookieOptions
}
=
require("../config/session-config");


router.use(

    setNoStore

);


function regenerateSession(req){


    return new Promise(

        (resolve,reject)=>{


            req.session.regenerate(

                error=>{


                    if(error){


                        reject(error);


                        return;


                    }


                    resolve();


                }

            );


        }

    );


}


function saveSession(req){


    return new Promise(

        (resolve,reject)=>{


            req.session.save(

                error=>{


                    if(error){


                        reject(error);


                        return;


                    }


                    resolve();


                }

            );


        }

    );


}


/**
 * GET /api/admin/auth/me
 */
router.get(

    "/me",

    (req,res)=>{


        if(

            !isAdminAuthenticated(req)

        ){


            return res

            .status(401)

            .json({


                success:false,


                authenticated:false,


                code:"ADMIN_AUTH_REQUIRED"


            });


        }


        return res.json({


            success:true,


            authenticated:true,


            admin:{


                username:

                req.session.admin.username


            }


        });


    }

);


/**
 * POST /api/admin/auth/login
 */
router.post(

    "/login",

    loginRateLimit,

    async(req,res)=>{


        try{


            const username =

            typeof req.body.username === "string"

            ?

            req.body.username.trim()

            :

            "";


            const password =

            typeof req.body.password === "string"

            ?

            req.body.password

            :

            "";


            const valid =

            await adminAuthService

            .validateCredentials(

                username,

                password

            );


            if(!valid){


                recordFailedLogin(req);


                return res

                .status(401)

                .json({


                    success:false,


                    code:"INVALID_CREDENTIALS",


                    message:

                    "Invalid username or password"


                });


            }


            clearLoginFailures(req);


            await regenerateSession(req);


            req.session.admin =

            adminAuthService

            .createSessionAdmin(

                username

            );


            await saveSession(req);


            return res.json({


                success:true,


                authenticated:true,


                admin:{


                    username:

                    username


                }


            });


        }

        catch(error){


            console.error(

                "Admin login error:",

                error.message

            );


            return res

            .status(500)

            .json({


                success:false,


                code:"ADMIN_LOGIN_FAILED",


                message:

                "Unable to sign in"


            });


        }


    }

);


/**
 * POST /api/admin/auth/logout
 */
router.post(

    "/logout",

    (req,res)=>{


        const {
            maxAge,
            ...cookieOptions
        }
        =
        getCookieOptions();


        if(!req.session){


            res.clearCookie(

                COOKIE_NAME,

                cookieOptions

            );


            return res.json({


                success:true


            });


        }


        req.session.destroy(

            error=>{


                if(error){


                    console.error(

                        "Admin logout error:",

                        error

                    );


                    return res

                    .status(500)

                    .json({


                        success:false,


                        message:

                        "Unable to sign out"


                    });


                }


                res.clearCookie(

                    COOKIE_NAME,

                    cookieOptions

                );


                return res.json({


                    success:true


                });


            }

        );


    }

);


module.exports =
router;
