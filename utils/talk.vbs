
' Tiny Text to Speech (only works on Windows)!
' (c) 2020 tuomo@smartpx.fi
'
' Commandline usage:
' wscript talk.vbs Hello world!

sub Talk(message)
	Dim sapi
	Set sapi=CreateObject("sapi.spvoice")
	sapi.Speak message
end sub

If WScript.Arguments.Count > 0 Then
	dim message
	for x=0 to WScript.Arguments.Count-1
		message = message & " " & WScript.Arguments.Item(x)
	next
	Talk(message)
End If

