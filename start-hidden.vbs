Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = "C:\Users\jorge\Documents\entusados-web"
shell.Run "cmd.exe /c """"C:\Program Files\nodejs\node.exe"" ""node_modules\vite\bin\vite.js"" --port 5173 >> ""%TEMP%\entusados-dev.log"" 2>&1""", 0, False
