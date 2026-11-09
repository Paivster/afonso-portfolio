@echo off
title Atualizar Portfolio Afonso Paiva
echo ========================================================
echo   ATUALIZAR FOTOGRAFIAS E GALERIA DO PORTEFOLIO
echo ========================================================
echo.
echo [1/3] A otimizar fotos novas para o padrao da web...
powershell -ExecutionPolicy Bypass -File "%~dp0optimize-images.ps1"
echo.
echo [2/3] A indexar novas colecoes e atualizar datas...
powershell -ExecutionPolicy Bypass -File "%~dp0update-gallery.ps1"
echo.
echo [3/3] A sincronizar com a pasta do GitHub...
robocopy "%~dp0images\collections" "%~dp0..\afonso-portfolio\images\collections" /MIR /XF *.psd /R:1 /W:1 >nul
copy /Y "%~dp0js\collections-data.js" "%~dp0..\afonso-portfolio\js\collections-data.js" >nul
copy /Y "%~dp0js\custom-metadata.json" "%~dp0..\afonso-portfolio\js\custom-metadata.json" >nul
echo.
echo ========================================================
echo   TUDO PRONTO COM SUCESSO!
echo   Agora abre o GitHub Desktop e clica em 'Push origin'!
echo ========================================================
echo.
pause
