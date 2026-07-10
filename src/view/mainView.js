const baudSelection = document.getElementById("baud-rate-selection");
const baudCustomInput = document.getElementById("custom-baud-rate-input");

const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const connectionSettingsContainer = document.querySelector(".connection-settings-container")

const mainContentContainer = document.querySelector(".main-content-container");
const coverContainer = document.querySelector(".main-cover-container");
const inputTextArea = document.getElementById("inputField");
const outputTextArea = document.getElementById("outputField"); 

export function enableCustomBaudInput(){
    const select = baudSelection.value;
    if(select === "custom")
        baudCustomInput.disabled = false;
    else{
        baudCustomInput.disabled = true;
        baudCustomInput.value = "";
    }
}

export function disableBaudrateInput(bool){
    baudSelection.disabled = bool;
    baudCustomInput.disabled = bool;
}

export function getBaudrate(){
    let baudRate = parseInt(baudCustomInput.value);
    
    if(baudCustomInput.disabled == false && Number.isInteger(baudRate)){
        console.log(baudRate);
        baudRate = Number(baudRate);
    }
    else if(Number.isInteger(baudSelection.value))
        baudRate = baudSelection.value;
    else baudRate = 9600;

    return baudRate;
}

export function enableConnectionButtons(bool){
    connectBtn.disabled = !bool;
    disconnectBtn.disabled = !bool;
}

export function setConnectionButtonAvailability(bool = true){
    connectBtn.disabled = bool;
    disconnectBtn.disabled = !bool;
}

const connecitonSpecifierText = document.getElementById("connection-text-span");
export function highlightConnection(bool){
    connectionSettingsContainer.dataset.connected = bool;
    bool ? connecitonSpecifierText.innerText = "Connected" : connecitonSpecifierText.innerText = "Not Connected";
}

export function toWindow(window){
    mainContentContainer.dataset.open_window = window;
}

export function disableCover(bool){
    coverContainer.dataset.port_open = bool;
}

export function getInputText(){
    const buff = inputTextArea.value;
    //inputTextArea.value = "";
    return buff;
}

export function enableInputTextArea(bool){
    if(!bool) inputTextArea.value = "";
    inputTextArea.disabled = !bool;
}

export function writeOutputText(str){
    outputTextArea.value = "";
    outputTextArea.value += str;
}

const manDataSendBtn = document.getElementById("dataSendBtn");
export function enableManDataSendBtn(bool){
    manDataSendBtn.disabled = !bool;
}
