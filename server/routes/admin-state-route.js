/**
 * Meridian Admin State Route
 *
 * Admin Dashboard State Restore API
 *
 * Version:
 * v2.3.6
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
            const overview =
                await sessionService
                .getAdminVisitorOverview();

            res.json({
                success: true,
                sessions:
                    overview.sessions,
                onlineUsers:
                    overview.onlineUsers,
                offlineUsers:
                    overview.offlineUsers,
                visitorStats:
                    overview.visitorStats
            });
        }
        catch(error){
            console.error(
                "Admin state error:",
                error
            );

            res.status(500)
            .json({
                success: false,
                error: error.message
            });
        }
    }
);


module.exports = router;
