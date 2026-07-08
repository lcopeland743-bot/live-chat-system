window.MeridianTime = {

    now() {

        return new Date().toISOString();

    },


    format(time) {

        const date = new Date(time);


        return date.toLocaleString("zh-CN", {

            hour12: false,

            year: "numeric",

            month: "2-digit",

            day: "2-digit",

            hour: "2-digit",

            minute: "2-digit",

            second: "2-digit"

        });

    },


    timestamp() {

        return Date.now();

    }

};