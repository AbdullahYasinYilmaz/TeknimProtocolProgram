const btnContainer = document.querySelector(".buttonsContainer");
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");

const textAreaContainer = document.querySelector(".textAreaContainer");
const inputTextArea = document.getElementById("inputField");
const outputTextArea = document.getElementById("outputField"); 

export function enableConnectionButtons(bool){
    connectBtn.disabled = !bool;
    disconnectBtn.disabled = !bool;
}

export function highlightConnection(bool){
    btnContainer.dataset.connected = bool;
}

export function displayTextFields(bool){
    textAreaContainer.dataset.port_open = bool;
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
