/**
 * Meridian Session Agent Route
 *
 * Multi Agent Assignment API
 *
 * Version:
 * v2.1.2
 *
 * Features:
 * - Assign Agent
 * - Release Agent
 * - Get Agent Sessions
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
 * 分配客服
 *
 * POST
 * /api/sessions/:userId/assign
 *
 * body:
 *
 * {
 *   agentId,
 *   agentName
 * }
 */
router.post(

    "/:userId/assign",

    async(req,res)=>{


        try{


            const session =

            await sessionService.assignAgent(

                req.params.userId,

                req.body.agentId,

                req.body.agentName

            );



            res.json({

                success:true,

                session:session

            });



        }

        catch(error){


            console.error(error);


            res.status(500).json({

                success:false,

                error:error.message

            });


        }


    }

);









/**
 * 解除客服
 *
 * POST
 * /api/sessions/:userId/release
 */
router.post(

    "/:userId/release",

    async(req,res)=>{


        try{


            const session =

            await sessionService.releaseAgent(

                req.params.userId

            );



            res.json({

                success:true,

                session:session

            });



        }

        catch(error){


            res.status(500).json({

                success:false,

                error:error.message

            });


        }


    }

);









/**
 * 查询客服客户
 *
 * GET
 * /api/sessions/agent/:agentId
 */
router.get(

    "/agent/:agentId",

    async(req,res)=>{


        try{


            const sessions =

            await sessionService.getAgentSessions(

                req.params.agentId

            );



            res.json({

                success:true,

                sessions:sessions

            });



        }

        catch(error){


            res.status(500).json({

                success:false,

                error:error.message

            });


        }


    }

);









module.exports = router;