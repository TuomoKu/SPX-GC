REM
REM About SPX ASSETS/scripts -folder
REM
REM Each operating system has a different fileformat for creating batch
REM files or shell scripts. On Windows, the file extension is usually .BAT
REM and on Linux and Mac it is usually '.sh'. Shell scripts can execute
REM various command line commands open applications etc.
REM These scripts can be executed in SPX using API endpoint:
REM
REM         /api/v1/executeScript?file=<filename.ext>
REM
REM IMPORTANT: 
REM IT IS YOUR RESPONSIBILITY TO ENSURE THAT THE SCRIPTS AND
REM COMMANDS ARE CORRECT FOR YOUR OPERATING SYSTEM AND THAT
REM THEY ARE SAFE TO EXECUTE! NO WARRANTY IS GIVEN OR IMPLIED!
REM
REM Seek information about shell scripts for your operating system.
REM
REM The following code will execute the command line 'calc.exe'
REM and open the Windows calculator. Will work in Windows only.


START calc.exe