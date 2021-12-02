const CronJob = require('cron').CronJob;
const shell = require('shelljs');
const colors = require('colors');
const parser = require('cron-parser');
const config = require('./config.json');

const cron_patern = `${config.min} ${config.hour} ${config.dayom} ${config.month} ${config.dayow}`;
var interval = parser.parseExpression(cron_patern);

console.log(`Minecraft Auto Overviewer Ready!`.green + ` Next Render scheduled for ${interval.next().toString()}`.yellow);
var job = new CronJob(cron_patern, function() {
    for (var server of config.servers){
        console.log(`${server.name} render Started!`.green);

        console.log(`Extracting ${server.name}'s world from docker container...`.yellow)
        try {
            shell.exec(`docker cp ${server.container_id}:/home/container/qb_multi/slot1/world /home/wrenders/sources/${server.name}`);
        } catch (error) {
            console.log('Error while extracting source world from docker container'.red);
            ErrorExit();
        }
        console.log(`Extraction completed`.green);
        console.log(`Starting rendering process`.cyan)



        var render_shell_out = shell.exec(`python${config.python_ver} ${config.minecraft_overviewer_loc} --config=${config.minecraft_overviewer_configfile_loc}`);
        var renderResult = (render_shell_out.substring(render_shell_out.length - 28, render_shell_out.length)).replace(/\s+/g, '');

        if (renderResult != "openindex.htmltoviewit.") {
            console.log(`Error Minecraft Overviewer Render Failed`.red);
            ErrorExit();
        } else {
            console.log('Render complete!'.green);
        }

        console.log('Copying new assets'.yellow);
        for (var i = 0; i < config.assets.length; i++) {
            try {
                shell.cp(`./assets/${config.assets[i]}`, `${config.render_out_dir}`);
            } catch (error) {
                console.log('Error while copying assets to render folder'.red);
                ErrorExit();
            }
            console.log(` => ${config.assets[i]} copied to render folder.`.cyan);
        }   
        shell.rm('-r', `/home/wrenders/sources/${server.name}/world`);
        console.log('New Assets Copied'.green);
        console.log(`${server.name} AUTO RENDER COMPLETE!`.green + ` Last Render: ${interval.prev().toString()}`.cyan);
    }
    
    console.log("Bulk worlds renders complete!".green)
    console.log(`Next Bulk Render scheduled for ${interval.next().toString()}`.yellow);
}, null, true, config.time_zone);
job.start();

function ErrorExit() {
    console.log(`Failed to complete Minecraft Auto Overviewer schedule`.red)
    console.log(`Exiting Minecraft Auto Overviewer...`.yellow)
    process.exit();
}