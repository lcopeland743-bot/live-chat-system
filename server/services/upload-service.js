/**
 * Meridian Upload Service
 *
 * Version:
 * v2.0.3
 *
 * Image Upload Service
 */


const path = require("path");

const fs = require("fs");





const uploadDir =

path.join(

    process.cwd(),

    "server",

    "uploads"

);







/**
 * 初始化上传目录
 */
function ensureUploadDir(){


    if(!fs.existsSync(uploadDir)){


        fs.mkdirSync(

            uploadDir,

            {
                recursive:true
            }

        );


    }


}









/**
 * 获取上传目录
 */
function getUploadPath(){


    ensureUploadDir();


    return uploadDir;


}









/**
 * 文件类型验证
 */
function checkImageType(file){



    const allowTypes = [


        "image/jpeg",


        "image/png",


        "image/gif",


        "image/webp"


    ];




    return allowTypes.includes(

        file.mimetype

    );



}









module.exports = {


    getUploadPath,


    checkImageType


};