c:\steamcmd\steamcmd.exe +login anonymous +app_update 343050 validate +quit
cd /D "c:\steamcmd\steamapps\common\Don't Starve Together Dedicated Server\bin"
start "dst-master-shard" dontstarve_dedicated_server_nullrenderer -console -cluster MyDediServer -shard Master
start "dst-caves-shard" dontstarve_dedicated_server_nullrenderer -console -cluster MyDediServer -shard Caves