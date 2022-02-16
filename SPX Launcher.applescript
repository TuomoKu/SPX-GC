-- SPX Launcher (AppleScript as App)
-- (c) 2021 SmartPX
-- ----------------------------------------------
-- 1: Start SPX Server process in a Terminal
-- 2: Open browser to it

tell application "Finder"
	set SPXapp to (POSIX path of (container of (path to me) as alias)) & "SPX_macos64"
end tell

display dialog "Starting SPX server in Terminal 

" & SPXapp & "

Once SPX server process has started a web browser will open and navigate to the displayed URL, usually http://localhost:5656. Closing the Terminal window will stop the server." with title "SPX Graphics Controller"

tell application "Terminal"
	activate
	do script SPXapp
end tell

delay 5
do shell script "open http://localhost:5656"