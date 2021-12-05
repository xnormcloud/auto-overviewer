const CronJob = require('cron').CronJob;
const shell = require('shelljs');
const colors = require('colors');
const parser = require('cron-parser');
const nodemailer = require("nodemailer");
const config = require('./config.json');
const mailer_config = require('./mailer_config.json');

const cron_patern = `${config.min} ${config.hour} ${config.dayom} ${config.month} ${config.dayow}`;
var interval = parser.parseExpression(cron_patern);

console.log(`Minecraft Auto Overviewer Ready!`.green + ` Next Bulk Render scheduled for ${interval.next().toString()}`.yellow);
async function main(){
for (var server of config.servers) {
    console.log(`${server.name} render process Started!`.green);

    console.log(`Extracting ${server.name}'s world from docker container...`.yellow)
    try {
        shell.exec(`docker cp ${server.container_id}:/home/container/qb_multi/slot1/world /home/wrenders/sources/${server.name}`);
    } catch (error) {
        console.log('Error while extracting source world from docker container'.red);
        ErrorExit("Docker container extraction process failure");
    }
    console.log(`Extraction completed`.green);
    console.log(`Starting rendering process`.cyan)

    var render_shell_out = shell.exec(`python${config.python_ver} ${config.minecraft_overviewer_loc} --config=./overviewer/configs/${server.name}.txt`);
    var renderResult = (render_shell_out.substring(render_shell_out.length - 28, render_shell_out.length)).replace(/\s+/g, '');

    if (renderResult != "openindex.htmltoviewit.") {
        console.log(`Error Minecraft Overviewer Render Failed`.red);
        ErrorExit(render_shell_out);
    } else {
        console.log('Render complete!'.green);
    }

    console.log('Copying new assets'.yellow);
    for (var asset of server.assets){
      try {
        shell.cp(`./assets/default/${asset}`, `${config.render_out_dir}/${server.name}`);
      } catch (error) {
        console.log('Error while copying assets to render folder'.red);
        ErrorExit("Assets copying process failure");
      }
      console.log(` => ${config.asset} copied to render folder.`.cyan);
    }

    shell.rm('-r', `/home/wrenders/sources/${server.name}/world`);
    console.log('New Assets Copied'.green);
    RenderComplete(server);
    console.log(`${server.name} AUTO RENDER COMPLETE!`.green + ` Last Render: ${interval.prev().toString()}`.cyan);
}
BulkComplete();
console.log("Bulk worlds renders complete!".green);
}

function RenderComplete(server) {
    const transporter = nodemailer.createTransport({
        host: mailer_config.contacter_server,
        port: 465,
        secure: true,
        auth: {
            user: mailer_config.contacter,
            pass: mailer_config.contacter_pass
        }
    })

    const mailOptions = {
        from: `Xnorm World <${mailer_config.contacter}>`,
        to: server.email,
        text: "Hi! Your render is finally complete!",
        html: {
            path: `email/templates/${server.name}.html`
        },
    }
    asyncSender(mailOptions, 1)
}

function BulkComplete() {
    const transporter = nodemailer.createTransport({
        host: mailer_config.contacter_server,
        port: 465,
        secure: true,
        auth: {
            user: mailer_config.contacter,
            pass: mailer_config.contacter_pass
        }
    })

    const mailOptions = {
        from: `Xnorm World <${mailer_config.contacter}>`,
        to: mailer_config.admin_email,
        subject: `Bulk Rendering Complete!`,
        text: "All scheduled renders were completed",
    }
    asyncSender(mailOptions, 0)
}



function ErrorExit(errormsg) {
    console.log(`Failed to complete Minecraft Auto Overviewer schedule`.red)
    console.log(`Sending crash notification to Xnorm Admins`.cyan)
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
    asyncSender(mailOptions, 0)
}




//Mailing system (async)
async function mailSender(mailOptions){
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
async function asyncSender(mailOptions){
    await mailSender(mailOptions);
    if (type == 0){
        console.log(`Exiting Minecraft Auto Overviewer...`.yellow);
        process.exit();
    } else {
        return;
    }
};

