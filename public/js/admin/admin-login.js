/**
 * Meridian Admin Login
 *
 * Version:
 * v2.1.2
 */

(function(){


    const form =

    document.getElementById(

        "adminLoginForm"

    );


    const usernameInput =

    document.getElementById(

        "adminUsername"

    );


    const passwordInput =

    document.getElementById(

        "adminPassword"

    );


    const submitButton =

    document.getElementById(

        "adminLoginSubmit"

    );


    const statusElement =

    document.getElementById(

        "adminLoginStatus"

    );


    function setStatus(message){


        statusElement.textContent =

        message

        ||

        "";


    }


    function getDestination(){


        const params =

        new URLSearchParams(

            window.location.search

        );


        const next =

        params.get("next");


        if(

            next

            &&

            next.startsWith("/admin")

            &&

            !next.startsWith("//")

        ){


            return next;


        }


        return "/admin.html";


    }


    async function checkExistingSession(){


        try{


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


            if(response.ok){


                window.location.replace(

                    getDestination()

                );


            }


        }

        catch(error){


            console.warn(

                "Admin session check failed:",

                error

            );


        }


    }


    form.addEventListener(

        "submit",

        async(event)=>{


            event.preventDefault();


            setStatus("");


            const username =

            usernameInput.value.trim();


            const password =

            passwordInput.value;


            if(

                !username

                ||

                !password

            ){


                setStatus(

                    "Enter your username and password."

                );


                return;


            }


            submitButton.disabled =

            true;


            submitButton.textContent =

            "Signing In...";


            try{


                const response =

                await fetch(

                    "/api/admin/auth/login",

                    {


                        method:"POST",


                        credentials:

                        "same-origin",


                        headers:{


                            "Content-Type":

                            "application/json"


                        },


                        body:

                        JSON.stringify({


                            username:

                            username,


                            password:

                            password


                        })


                    }

                );


                const result =

                await response.json()


                .catch(

                    ()=>({})

                );


                if(!response.ok){


                    if(response.status === 429){


                        setStatus(

                            result.message

                            ||

                            "Too many attempts. Try again later."

                        );


                    }

                    else{


                        setStatus(

                            "Invalid username or password."

                        );


                    }


                    return;


                }


                window.location.replace(

                    getDestination()

                );


            }

            catch(error){


                console.error(

                    "Admin login request failed:",

                    error

                );


                setStatus(

                    "Unable to connect to the server."

                );


            }

            finally{


                submitButton.disabled =

                false;


                submitButton.textContent =

                "Sign In";


            }


        }

    );


    checkExistingSession();


})();
