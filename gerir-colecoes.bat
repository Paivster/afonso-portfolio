@echo off
title Painel de Gestao - Afonso Paiva
echo ========================================================
echo   PAINEL DE GESTAO DE COLECOES E FOTOS
echo ========================================================
echo.
echo A abrir o painel de gestao no teu navegador...
start http://localhost:8000/admin.html
powershell -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
