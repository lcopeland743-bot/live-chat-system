/**
 * Meridian Admin Authentication Middleware
 *
 * Version:
 * v2.1.2
 */

function isAdminAuthenticated(req){


    return Boolean(

        req.session

        &&

        req.session.admin

        &&

        req.session.admin.authenticated === true

    );


}


function setNoStore(

    req,

    res,

    next

){


    res.set(

        "Cache-Control",

        "no-store, no-cache, must-revalidate, private"

    );


    res.set(

        "Pragma",

        "no-cache"

    );


    next();


}


function requireAdminApi(

    req,

    res,

    next

){


    if(

        isAdminAuthenticated(req)

    ){


        return next();


    }


    return res

    .status(401)

    .json({


        success:false,


        code:"ADMIN_AUTH_REQUIRED",


        message:"Administrator authentication required"


    });


}


function requireAdminPage(

    req,

    res,

    next

){


    if(

        isAdminAuthenticated(req)

    ){


        return next();


    }


    return res.redirect(

        "/admin-login.html"

    );


}


module.exports = {


    isAdminAuthenticated,


    setNoStore,


    requireAdminApi,


    requireAdminPage


};
