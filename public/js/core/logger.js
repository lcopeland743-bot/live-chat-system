window.MeridianLogger = {

    enabled: true,


    setEnabled(status) {

        this.enabled = status;

    },


    info(message, data = null) {

        if (!this.enabled) return;

        console.log(
            `[Meridian INFO] ${message}`,
            data || ""
        );

    },


    warn(message, data = null) {

        if (!this.enabled) return;

        console.warn(
            `[Meridian WARN] ${message}`,
            data || ""
        );

    },


    error(message, data = null) {

        if (!this.enabled) return;

        console.error(
            `[Meridian ERROR] ${message}`,
            data || ""
        );

    }

};