/**
 * Generate a bcrypt hash without printing the password.
 *
 * Run:
 * npm run admin:hash
 */

const bcrypt =
require("bcryptjs");


function readHidden(promptText){


    return new Promise(

        (resolve,reject)=>{


            if(

                !process.stdin.isTTY

                ||

                typeof process.stdin.setRawMode !== "function"

            ){


                reject(

                    new Error(

                        "This command must run in an interactive terminal"

                    )

                );


                return;


            }


            process.stdout.write(

                promptText

            );


            let value = "";


            const onData =

            chunk=>{


                const text =

                chunk.toString("utf8");


                for(const character of text){


                    if(

                        character === "\u0003"

                    ){


                        process.stdin.setRawMode(false);


                        process.stdin.pause();


                        process.stdout.write("\n");


                        process.exit(130);


                    }


                    if(

                        character === "\r"

                        ||

                        character === "\n"

                    ){


                        process.stdin.off(

                            "data",

                            onData

                        );


                        process.stdin.setRawMode(false);


                        process.stdin.pause();


                        process.stdout.write("\n");


                        resolve(value);


                        return;


                    }


                    if(

                        character === "\u007f"

                        ||

                        character === "\b"

                    ){


                        if(value.length > 0){


                            value =

                            value.slice(0,-1);


                            process.stdout.write(

                                "\b \b"

                            );


                        }


                        continue;


                    }


                    if(

                        character >= " "

                    ){


                        value += character;


                        process.stdout.write("*");


                    }


                }


            };


            process.stdin.setEncoding("utf8");


            process.stdin.setRawMode(true);


            process.stdin.resume();


            process.stdin.on(

                "data",

                onData

            );


        }

    );


}


async function main(){


    const first =

    await readHidden(

        "Enter the new admin password: "

    );


    const second =

    await readHidden(

        "Confirm the admin password: "

    );


    if(first !== second){


        throw new Error(

            "Passwords do not match"

        );


    }


    if(first.length < 12){


        throw new Error(

            "Use an admin password with at least 12 characters"

        );


    }


    if(first.length > 256){


        throw new Error(

            "The password is too long"

        );


    }


    const hash =

    await bcrypt.hash(

        first,

        12

    );


    console.log(

        "\nADMIN_PASSWORD_HASH="

        +

        hash

    );


}


main()

.catch(

    error=>{


        console.error(

            "\nHash generation failed:",

            error.message

        );


        process.exit(1);


    }

);
