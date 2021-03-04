del /q "C:\Users\krthu\Documents\DST Backups\dump\*"
FOR /D %%p IN ("C:\Users\krthu\Documents\DST Backups\dump\*.*") DO rmdir "%%p" /s /q
robocopy "C:\Users\krthu\Documents\Klei\DoNotStarveTogether" "C:\Users\krthu\Documents\DST Backups\dump" /mir
del /q "C:\Users\krthu\Documents\Klei\DoNotStarveTogether\*"
FOR /D %%p IN ("C:\Users\krthu\Documents\Klei\DoNotStarveTogether\*.*") DO rmdir "%%p" /s /q
for /f "delims=" %%i in ('dir /b/od/t:c "C:\Users\krthu\Documents\DST Backups\"') do (
	if not %%i==dump (
		set LAST=%%i
	)
)
robocopy "C:\Users\krthu\Documents\DST Backups\%LAST%" "C:\Users\krthu\Documents\Klei\DoNotStarveTogether" /mir
IF NOT ERRORLEVEL 2 (exit /B 0) else (exit /B 1)
