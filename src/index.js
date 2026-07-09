import {writeToPort, connectToPort, disconnectFromPort, checkPortUpdateUI, initSerialSignals } from "./manager/serialManager.js";
import { enableCustomBaudInput, toWindow } from "./view/mainView.js";

const baudSelection = document.getElementById("baud-rate-selection");
const baudCustomInput = document.getElementById("custom-baud-rate-input");

const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const sendDataBtn = document.getElementById("dataSendBtn");

const toManuelBtn = document.getElementById("manual-mode-button");
const toAutomaticBtn = document.getElementById("automatic-mode-button");

initProgram();

function initProgram(){
    checkPortUpdateUI();
    initSerialSignals();
    initButtons();
}

function initButtons(){
    baudSelection.addEventListener("change",()=>{
        enableCustomBaudInput();
    })
    connectBtn.addEventListener("click",()=>{
        connectToPort();
    });
    disconnectBtn.addEventListener("click",()=>{
        disconnectFromPort();
    });
    sendDataBtn.addEventListener("click",async ()=>{
        await writeToPort();
    });
    toManuelBtn.addEventListener("click",()=>{
        toWindow(1);
    });
    toAutomaticBtn.addEventListener("click",()=>{
        toWindow(2);
    });
}