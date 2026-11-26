@echo off
cd /d "%~dp0"
pg17\package\native\bin\pg_ctl.exe -D pgdata status >nul 2>&1 || pg17\package\native\bin\pg_ctl.exe -D pgdata -l postgres.log -w start
cd server
tinode-recall.exe -static_data=../frontend

