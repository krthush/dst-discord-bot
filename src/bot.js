// bot/dst servers only work for windows
if (process.platform !== 'win32') {
    throw new Error('Windows only');
}

// manage env vars
require('dotenv').config();

// constants
const { Client } = require('discord.js'); // discord api
const fs = require('fs');
const util = require('util');
const exec_file = require('child_process').execFile;
const exec_promise = util.promisify(require('child_process').exec);
Tail = require('tail').Tail;
const client = new Client();
const PREFIX = process.env.COMMAND_PREFIX;
const ADMIN_ROLE = process.env.ADMIN_ROLE;
const MAIN_CHANNEL_ID = process.env.MAIN_CHANNEL_ID;
const MASTER_SERVER_LOG = process.env.MASTER_SERVER_LOG;
const CAVES_SERVER_LOG = process.env.CAVES_SERVER_LOG;
const CHAT_SERVER_LOG = process.env.CHAT_SERVER_LOG;
const AHK_SCRIPT = 'DSTServerInput.exe';
const STARTUP_SCRIPT = 'StartDSTServer.bat';
const BACKUP_SCRIPT = 'BackupDSTServer.bat';
const RESTORE_SCRIPT = 'RestoreDSTServer.bat';
const DST_SERVER_TASK_NAME = 'dontstarve_dedicated_server_nullrenderer.exe';
const SERVER_ACTION_DELAY = 1000;
const SERVER_SAVE_DELAY = 5000;
const SERVER_ONLINE_STRING = "Registering master server";
const SERVER_OFFLINE_STRING = "Shutting down";

// vars
var serverStartingUp = false;
var serverShuttingDown = false;
var logOutputCounter = 0;
var prevLogString = "";
var runningRestoration = false;

client.on('ready', () => {

    console.log(`${client.user.username} has logged in.`);
    const mainChannel = client.channels.cache.find(channel => channel.id === MAIN_CHANNEL_ID);
    mainChannel.send("I'm awake and ready to not starve!");

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
                if (!serverStartingUp) {
                    serverStartingUp = true;
                    isDSTServerOnline().then((serverOnline) => {
                        if (!serverOnline) {
                                console.log("Starting up DST server...");
                                message.channel.send("Starting up DST server...");
                                // use child process to run .bat
                                exec_file(STARTUP_SCRIPT, function(err, data) {
                                    if (err) console.log(err);
                                });
                                setupLogTails(message);
                        } else {
                            message.channel.send("Server already online.");
                            serverStartingUp = false;
                        }
                    });
                } else {
                    message.channel.send("Attempting server startup already.");
                }
            }

            // shutdown command
            if (command === "shutdown") {
                if (!serverShuttingDown) {
                    serverShuttingDown = true;
                    isDSTServerOnline().then((serverOnline) => {
                        if (serverOnline) {
                                console.log("Shutting down DST server...");
                                message.channel.send("Shutting down DST server...");
                                // use child process to run .exe
                                runDSTServerCommand("caves", "c_shutdown()");
                                // shut master down after small delay
                                setTimeout(function(){ runDSTServerCommand("master", "c_shutdown()"); }, SERVER_ACTION_DELAY);
                        } else {
                            message.channel.send("Server already offline.");
                            serverShuttingDown = false;
                        }
                    });
                } else {
                    message.channel.send("Attempting server shutdown already.");
                }
            }

            // backup command
            if (command === "backup") {
                isDSTServerOnline().then((serverOnline) => {
                    if (serverOnline) {
                        console.log("Saving server first.");
                        // use child process to run scripts
                        runDSTServerCommand("master", "c_save()");
                        setTimeout(function(){ runDSTServerCommand("caves", "c_save()"); }, SERVER_ACTION_DELAY);
                        console.log("Running back up script.");
                        setTimeout(function(){
                            // use child process to run .bat
                            exec_file(BACKUP_SCRIPT, function(err, data) {
                                if (err) console.log(err);
                                message.channel.send("Server saved and backup batch script was run.");
                            });
                        }, SERVER_SAVE_DELAY);
                    } else {
                        console.log("Running back up script.");
                        setTimeout(function(){
                            // use child process to run .bat
                            exec_file(BACKUP_SCRIPT, function(err, data) {
                                if (err) console.log(err);
                                message.channel.send("Backup batch script was run.");
                            });
                        }, SERVER_ACTION_DELAY);
                    }
                });
            }

            // restore command
            if (command === "restore") {
                isDSTServerOnline().then((serverOnline) => {
                    if (serverOnline || serverShuttingDown || serverStartingUp) {
                        message.channel.send("Please shutdown server before restoration.");
                    } else {
                        runningRestoration = true;
                        console.log("Running restore...");
                        message.channel.send("Running restore...");
                        // use child process to run .bat to get backup
                        exec_file(RESTORE_SCRIPT, function(err, data) {
                            if (err) console.log(err);
                            runningRestoration = false;
                            console.log("Restore complete.");    
                            message.channel.send("Restore complete.");
                        });
                    }
                });
            }

            // general command
            if (command === "general") {
                isDSTServerOnline().then((serverOnline) => {
                    if (serverOnline) {
                        if (isNaN(args[0])) {
                            message.channel.send("Please specify number of output log lines (0 for none) in first parameter");
                        } else {
                            logOutputCounter = args[0];
                            if (args[1]=="master") {
                                args.shift();
                                args.shift();
                                // clean string for cmd line parameters
                                const dstCMD = args.join(' ').replace(/["]{2,}/g,'');
                                console.log("Running general command.");
                                message.channel.send("Running general command. I hope you know what you're doing.");
                                runDSTServerCommand("master", dstCMD);
                            } else if (args[1]=="caves") {
                                args.shift();
                                args.shift();
                                // clean string for cmd line parameters
                                const dstCMD = args.join(' ').replace(/["]{2,}/g,'');
                                console.log("Running general command.");
                                message.channel.send("Running general command. I hope you know what you're doing.");
                                runDSTServerCommand("caves", dstCMD);
                            } else {
                                message.channel.send("Please specify shard (master/caves) in second parameter");
                            }
                        }
                    } else {
                        message.channel.send("The server is shutdown.");
                    }
                });
            }

        }
    };
});

client.login(process.env.DISCORDJS_BOT_TOKEN);

function runDSTServerCommand(shard, command) {
    // use child process to run .exe
    exec_file(AHK_SCRIPT, [shard, command], function(err, data) {
        if (err) console.log(err);
    });
}

function setupLogTails(message) {
    console.log("Tails added.");
    var masterTail = new Tail(MASTER_SERVER_LOG, {useWatchFile: true});
    var cavesTail = new Tail(CAVES_SERVER_LOG, {useWatchFile: true});
    var chatTail = new Tail(CHAT_SERVER_LOG, {useWatchFile: true});
    masterTail.on("line", function(data) {
        if (logOutputCounter > 0) {
            logOutputCounter--;
            console.log(data);
            message.channel.send(data);
        }
        if (data.includes(SERVER_ONLINE_STRING)) {
            console.log(data);
            if (serverStartingUp) {
                serverStartingUp = false;
                console.log("Server is now online.");
                message.channel.send("Server is now online.");
            }
        }
        if (data.includes(SERVER_OFFLINE_STRING)) {
            console.log(data);
            if (serverShuttingDown) {
                serverShuttingDown = false;
                console.log("Server is now offline.");
                message.channel.send("Server is now offline.");
            }
        }
    });
    chatTail.on("line", function(data) {
        if (!runningRestoration) {
            console.log(data);
            // prevent double sending
            if (data != prevLogString) {
                // clean string
                var stringEdit = data.replace(/ *\[[^\]]*\]\: /,''); // remove first instance of sqaure brackets + text within
                // stringEdit = stringEdit.replace(/ *\([^)]*\)/g,''); // remove parenthesis + text within
                stringEdit = stringEdit.replace(/\[/,'[Server '); // add server identifier
                // send message through bot
                console.log(stringEdit);
                const mainChannel = client.channels.cache.find(channel => channel.id === MAIN_CHANNEL_ID);
                mainChannel.send(stringEdit);
            }
            prevLogString = data;
        }
    });
}

async function isDSTServerOnline() {
    console.log("Checking tasklist for DST server.");
    const { err, stdout } = await exec_promise(`tasklist /fi "Imagename eq ${DST_SERVER_TASK_NAME}" /fo csv /nh`, { shell: 'cmd.exe' });
    if (err) console.log(err);
    if (stdout.includes(DST_SERVER_TASK_NAME)) {
        console.log("DST server program found running.");
        return true;
    } else {
        console.log("DST server program not found running.");
        return false;
    }
}