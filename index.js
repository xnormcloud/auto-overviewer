const CronJob = require('cron').CronJob;
const shell = require('shelljs');
const colors = require('colors');
const parser = require('cron-parser');
const nodemailer = require("nodemailer");
const mailer_config = require('./config/mailer_config.json');
const config = require(`./config/${process.argv[2] != "" ? process.argv[2] : 'config.json'}`);
const cron_patern = `${config.min} ${config.hour} ${config.dayom} ${config.month} ${config.dayow}`;
var interval = parser.parseExpression(cron_patern);

console.log(`Minecraft Auto Overviewer Ready!`.green + ` Next Bulk Render scheduled for ${interval.next().toString()}`.yellow);
var job = new CronJob(cron_patern, function() {
    main();
}, null, true, config.time_zone);
job.start();

async function main() {
    for (var server of config.servers) {
        console.log(`${server.name} render process Started!`.green);

        console.log(`Extracting ${server.name}'s world from docker container...`.yellow)
        try {
            shell.exec(`docker cp ${server.container_id}:/home/container/qb_multi/slot1/world /home/wrenders/sources/${server.name}`);
        } catch (error) {
            console.log('Error while extracting source world from docker container'.red);
            await ErrorExit("Docker container extraction process failure");
            console.log(`Exiting Minecraft Auto Overviewer...`.yellow)
            process.exit();
        }
        console.log(`Extraction completed`.green);
        console.log(`Starting rendering process`.cyan)

        var render_shell_out = shell.exec(`python${config.python_ver} ${config.minecraft_overviewer_loc} --config=./overviewer/configs/${server.name}.txt`);
        var renderResult = (render_shell_out.substring(render_shell_out.length - 28, render_shell_out.length)).replace(/\s+/g, '');

        if (renderResult != "openindex.htmltoviewit.") {
            console.log(`Error Minecraft Overviewer Render Failed`.red);
            await ErrorExit(render_shell_out);
            console.log(`Exiting Minecraft Auto Overviewer...`.yellow)
            process.exit();
        }
        console.log('Render complete!'.green);

        console.log('Copying new assets'.yellow);
        for (var asset of server.assets) {
            try {
                shell.cp(`./assets/${config.dayow == "*" ? server.name : "default"}/${asset}`, `${config.render_out_dir}/${server.name}`);
            } catch (error) {
                console.log('Error while copying assets to render folder'.red);
                await ErrorExit("Assets copying process failure");
                console.log(`Exiting Minecraft Auto Overviewer...`.yellow)
                process.exit();
            }
            console.log(` => ${asset} copied to render folder.`.cyan);
        }

        shell.rm('-r', `/home/wrenders/sources/${server.name}/world`);
        console.log('New Assets Copied'.green);
        await RenderComplete(server);
        console.log(`${server.name} AUTO RENDER COMPLETE!`.green + ` Last Render: ${interval.prev().toString()}`.cyan);
    }
    await BulkComplete();
    console.log("Bulk worlds renders complete!".green);
    console.log(`Minecraft Auto Overviewer Ready!`.green + ` Next Bulk Render scheduled for ${interval.next().toString()}`.yellow);
}

async function RenderComplete(server) {
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
        subject: `Your world render is complete!`,
        text: "Hi! Your render is finally complete!",
        html: {
            path: `email/templates/${server.name}.html`
        },
    }

    return new Promise(function(resolve, reject) {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                reject(err);
            } else {
                console.log(`Email sent to ${server.name} owner/s`);
                resolve(info);
            }
        });
    });
};

async function BulkComplete() {
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
    return new Promise(function(resolve, reject) {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                reject(err);
            } else {
                console.log(`Email sent to sysadmins`);
                resolve(info);
            }
        });
    });
};


//Mailing system (async)
async function ErrorExit(errormsg) {
    console.log(`Failed to complete Minecraft Auto Overviewer schedule`.red)
    console.log(`Sending crash notification to Xnorm Admins`.cyan)
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
        subject: `⚠ System Fail`,
        text: `Something went wrong, and Minecraft Auto Overviewer stopped\n\n${errormsg}`,
    }
    return new Promise(function(resolve, reject) {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                reject(err);
            } else {
                console.log(`Email sent to sysadmins`);
                resolve(info);
            }
        });
    });
};