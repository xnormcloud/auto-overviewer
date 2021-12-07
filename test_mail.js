const CronJob = require('cron').CronJob;
const shell = require('shelljs');
const colors = require('colors');
const parser = require('cron-parser');
const nodemailer = require("nodemailer");
const config = require('./config.json');
const mailer_config = require('./mailer_config.json');

const cron_patern = `${config.min} ${config.hour} ${config.dayom} ${config.month} ${config.dayow}`;
var interval = parser.parseExpression(cron_patern);

const transporter = nodemailer.createTransport({
    host: "mail.privateemail.com",
    port: 465,
    secure: true,
    auth: {
        user: "no-reply@xnorm.world",
        pass: "HP@~4Ph@YKUU.vY7"
    }
})

const mailOptions = {
    from: `Xnorm World <no-reply@xnorm.world>`,
    to: "thegametesters1995@gmail.com",
    subject: `System Fail`,
    text: `Something went wrong, and Minecraft Auto Overviewer stopped`,
}


async function main(){
    await firstFunction(mailOptions);
    console.log("Testing".cyan)
    process.exit();
};

main();
console.log()

async function firstFunction(mailOptions){
    return new Promise(function (resolve, reject){
        transporter.sendMail(mailOptions, (error, info)=>{
            if(error){
                console.log(error);
                reject(err);   
            } else {
                console.log(`Email sent to`);
                resolve(info);
            }
        });
    });
};
