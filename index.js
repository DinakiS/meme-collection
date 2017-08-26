const {app, BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const url = require('url');

var fs = require('fs');

let win;

function createWindow() {
    win = new BrowserWindow({ width: 1280, height: 720, icon: __dirname + '/icon.ico' });
    
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'www/index.html'),
        protocol: 'file:',
        slashes: true
    }));
    
    //win.webContents.openDevTools();
    
    win.on('closed', () => {
        win = null;
    })
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platrofm !== 'darwin') {
        app.quit();
    }
})