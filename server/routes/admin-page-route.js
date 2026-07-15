/**
 * Meridian Protected Admin Page Routes
 *
 * Version:
 * v2.1.2
 */

const express =
require("express");


const path =
require("path");


const router =
express.Router();


const {
    isAdminAuthenticated,
    requireAdminPage,
    setNoStore
}
=
require("../middleware/admin-auth-middleware");


const projectRoot =

path.resolve(

    __dirname,

    "..",

    ".."

);


router.get(

    [

        "/admin-login",

        "/admin-login.html"

    ],

    setNoStore,

    (req,res)=>{


        if(

            isAdminAuthenticated(req)

        ){


            return res.redirect(

                "/admin.html"

            );


        }


        return res.sendFile(

            path.join(

                projectRoot,

                "public",

                "admin-login.html"

            )

        );


    }

);


router.get(

    [

        "/admin",

        "/admin.html"

    ],

    setNoStore,

    requireAdminPage,

    (req,res)=>{


        return res.sendFile(

            path.join(

                projectRoot,

                "server",

                "views",

                "admin.html"

            )

        );


    }

);


module.exports =
router;
