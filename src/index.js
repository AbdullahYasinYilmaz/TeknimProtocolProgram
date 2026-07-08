import {writeToPort, connectToPort, disconnectFromPort, checkPortUpdateUI, initSerialSignals } from "./manager/serialManager.js";

const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const btnContainer = document.querySelector(".buttonsContainer");
const sendDataBtn = document.getElementById("dataSendBtn");

initProgram();

function initProgram(){
    checkPortUpdateUI();
    initSerialSignals();
    initButtons();
}

function initButtons(){
    connectBtn.addEventListener("click",()=>{
        connectToPort();
    })
    disconnectBtn.addEventListener("click",()=>{
        disconnectFromPort();
    })
    sendDataBtn.addEventListener("click",async ()=>{
        await writeToPort();
    })
}