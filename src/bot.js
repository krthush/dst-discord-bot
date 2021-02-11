require('dotenv').config();

var exec = require('child_process').execFile;

// constants
const { Client } = require('discord.js');
const client = new Client();
const PREFIX = process.env.COMMAND_PREFIX;
const ADMIN_ROLE = process.env.ADMIN_ROLE;
const AHK_SCRIPT = 'DSTServerInput.exe';
const STARTUP_SCRIPT = 'StartDSTServer.bat';

client.on('ready', () => {
    console.log(`${client.user.username} has logged in.`)
});

client.on('message', (message) => {

    // ignore bot messages
    if (message.author.bot) return; 

    // check if admin
    if (message.member.roles.cache.some(r => r.name === ADMIN_ROLE)) {
        // check if admin command
        if (message.content.startsWith(PREFIX)) {

            // get command and args
            var [command, ...args] = message.content
                .trim()
                .substring(PREFIX.length)
                .split(/\s+/);

            // startup command
            if (command === "startup") {
                console.log("Starting up DST server...");
                message.channel.send("Starting up DST server...");
                // use child process to run .bat
                exec(STARTUP_SCRIPT, function(err, data) {  
                    console.log(err)
                    console.log(data.toString());                       
                });
            }

            // shutdown command
            if (command === "shutdown") {
                console.log("Shutting down DST server...");
                message.channel.send("Shutting down DST server...");
                // use child process to run .exe
                runDSTServerCommand("caves", "c_shutdown()");
                // shut master down after small delay
                setTimeout(function(){ runDSTServerCommand("master", "c_shutdown()"); }, 1000);
            }

            // general command
            if (command === "general") {
                console.log("Running general command.");
                message.channel.send("Running general command. I hope you know what you're doing.");
                if (args[0]=="master") {
                    args.shift();
                    // clean string for cmd line parameters
                    const DST_CMD = args.join(' ').replace(/["]{2,}/g,'');
                    runDSTServerCommand("master", DST_CMD);
                } else if (args[0]=="caves") {
                    args.shift();
                    // clean string for cmd line parameters
                    const DST_CMD = args.join(' ').replace(/["]{2,}/g,'');
                    runDSTServerCommand("caves", DST_CMD);
                } else {
                    message.channel.send("Please specific shard (master/caves) in first parameter");
                }
            }

        }
    };
});

client.login(process.env.DISCORDJS_BOT_TOKEN);

function runDSTServerCommand(shard, command) {
    // use child process to run .exe
    exec(AHK_SCRIPT, [shard, command], function(err, data) {
        if (err) {
            console.log("Error:" + err);
        }                      
    });
}