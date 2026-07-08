/**
 * Meridian Server Configuration
 *
 * 后端统一配置中心
 */


const config = {


    /**
     * Server Port
     *
     * Render 会自动提供 PORT
     * 本地默认 3000
     */
    port: process.env.PORT || 3000,



    /**
     * Environment
     */
    env: process.env.NODE_ENV || "development",



    /**
     * Server Information
     */
    appName: "Meridian Chat SDK",

    version: "1.1.0"



};



module.exports = config;