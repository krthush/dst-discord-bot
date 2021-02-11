if A_Args.length() = 2
{
	if A_Args[1] = "master"
	{
		if WinExist("dst-master-shard")
			WinActivate
		else
			return
		SendInput % A_Args[2]
		Send {Enter}
	}
	if A_Args[1] = "caves"
	{
		if WinExist("dst-caves-shard")
			WinActivate
		else
			return
		SendInput % A_Args[2]
		Send {Enter}
	}
}
ExitApp