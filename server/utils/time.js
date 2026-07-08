/**
 * Meridian Server Time Utility
 *
 * 后端统一时间管理
 */


const MeridianTime = {


    /**
     * 获取当前 UTC 时间
     */
    now() {

        return new Date().toISOString();

    },


    /**
     * 获取 Unix 时间戳
     */
    timestamp() {

        return Date.now();

    },


    /**
     * 格式化时间
     */
    format(time) {


        const date = new Date(time);


        return date.toLocaleString(
            "zh-CN",
            {

                hour12:false,

                year:"numeric",

                month:"2-digit",

                day:"2-digit",

                hour:"2-digit",

                minute:"2-digit",

                second:"2-digit"

            }
        );


    }


};


module.exports = MeridianTime;