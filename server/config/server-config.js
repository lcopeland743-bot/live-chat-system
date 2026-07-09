/**
 * Meridian Server Configuration
 *
 * Version:
 * v1.2.0
 *
 * Features:
 * - Server Config
 * - MongoDB Config
 */



module.exports = {



    /**
     * 服务端口
     */
    port:
    process.env.PORT
    ||
    3000,







    /**
     * MongoDB 配置
     *
     * 当前先使用环境变量
     *
     * 后续部署服务器时：
     * 修改环境变量即可
     */
    mongodb:{


        uri:

        process.env.MONGODB_URI

        ||

        "mongodb://127.0.0.1:27017/meridian_chat"



    },








    /**
     * Socket配置
     */
    socket:{


        cors:{


            origin:"*",


            methods:[

                "GET",

                "POST"

            ]


        }


    }






};