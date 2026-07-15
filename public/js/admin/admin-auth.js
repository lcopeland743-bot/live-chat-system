/**
 * Meridian Admin Authentication Client
 *
 * Version:
 * v2.1.2
 */

window.MeridianAdminAuth = {


    loginUrl:

    "/admin-login.html",


    redirecting:false,


    redirectToLogin(){


        if(this.redirecting){


            return;


        }


        this.redirecting =

        true;


        const next =

        window.location.pathname

        +

        window.location.search;


        const target =

        this.loginUrl

        +

        "?next="

        +

        encodeURIComponent(next);


        window.location.replace(

            target

        );


    },


    async getSession(){


        const response =

        await fetch(

            "/api/admin/auth/me",

            {


                credentials:

                "same-origin",


                cache:

                "no-store"


            }

        );


        if(response.status === 401){


            return {


                authenticated:false


            };


        }


        if(!response.ok){


            throw new Error(

                "Admin authentication check failed"

            );


        }


        return await response.json();


    },


    async requireAuthenticated(){


        try{


            const result =

            await this.getSession();


            if(

                !result.authenticated

            ){


                this.redirectToLogin();


                return false;


            }


            this.renderIdentity(

                result.admin

            );


            this.bindLogout();


            return true;


        }

        catch(error){


            console.error(

                "Admin authentication error:",

                error

            );


            return false;


        }


    },


    renderIdentity(admin){


        const element =

        document.getElementById(

            "adminIdentity"

        );


        if(element){


            element.textContent =

            admin

            &&

            admin.username

            ?

            admin.username

            :

            "Administrator";


        }


    },


    bindLogout(){


        const button =

        document.getElementById(

            "adminLogoutBtn"

        );


        if(!button){


            return;


        }


        button.onclick = ()=>{


            this.logout();


        };


    },


    async logout(){


        try{


            await fetch(

                "/api/admin/auth/logout",

                {


                    method:"POST",


                    credentials:

                    "same-origin",


                    headers:{


                        "Content-Type":

                        "application/json"


                    }


                }

            );


        }

        catch(error){


            console.error(

                "Admin logout failed:",

                error

            );


        }

        finally{


            this.redirectToLogin();


        }


    },


    handleUnauthorizedResponse(response){


        if(

            response

            &&

            response.status === 401

        ){


            this.redirectToLogin();


            return true;


        }


        return false;


    }


};
