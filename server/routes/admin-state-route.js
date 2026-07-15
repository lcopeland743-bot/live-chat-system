/**
 * Meridian Admin State Route
 *
 * Admin Dashboard State Restore API
 *
 * Version:
 * v2.1.2
 *
 * Data Source:
 * MongoDB Session
 */



const express =
require("express");


const router =
express.Router();


const {
    requireAdminApi
}
=
require("../middleware/admin-auth-middleware");







const sessionService =
require("../services/session-service");









router.use(

    requireAdminApi

);







/**
 * 获取后台完整状态
 *
 * GET
 * /api/admin/state
 */
router.get(

    "/",

    async(req,res)=>{



        try{



            const sessions =

            await sessionService.getSessions();








            /**
             * 根据Session状态分类
             */
            const onlineUsers =

            sessions.filter(

                session =>

                session.status === "online"

            );








            const offlineUsers =

            sessions.filter(

                session =>

                session.status === "offline"

            );









            res.json({



                success:true,



                sessions:



                sessions,





                onlineUsers:



                onlineUsers,





                offlineUsers:



                offlineUsers



            });






        }

        catch(error){



            console.error(

                "Admin state error:",

                error

            );






            res.status(500)

            .json({


                success:false,


                error:error.message



            });



        }



    }

);








module.exports = router;