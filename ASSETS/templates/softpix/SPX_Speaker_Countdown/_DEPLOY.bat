@REM @echo off

@REM echo Deleting build folder...
@REM rmdir /Q /S build
@REM echo.

@REM rem -- just "gulp" will execute both normal AND minify
@REM rem gulp

@rem gulp normal


@REM ----------------------------------------------------------------------------------

@echo off
rem To deploy: press Ctrl+Shift+B.
rem https://stackoverflow.com/questions/59844962/execute-a-bat-file-on-keypress-in-vscode
rem https://stackoverflow.com/questions/41046494/making-global-tasks-in-vs-code

set sourceFolder=.\
set targetFolder=X:\GC\ASSETS\templates\softpix\SPX_Speaker_Countdown
echo Deploy NORMAL build to:
echo %targetFolder%
echo.
echo This will REMOVE all existing files and folders and then 
echo will copy everything there.
echo.
echo Deleting target folder...
rmdir /Q/S %targetFolder%
echo Creating target folder...
mkdir %targetFolder%

xcopy %sourceFolder% %targetFolder%\ /q /s /e

:END
echo.
echo Completed deploy to  %targetFolder%.
echo.
