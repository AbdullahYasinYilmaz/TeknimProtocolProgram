import { displayTextFields, enableConnectionButtons, getInputText, highlightConnection, writeOutputText } from "../view/mainView.js";
import { byteToHexString, hexStringToByte } from "./encodingManager.js";

const Serial = navigator.serial;
let curPort = null;

export function checkPortUpdateUI(){
    checkConnection();
    checkPortOpening();
}

//returns connection status and updates connection signifier
export function checkConnection(){
    const connection = (curPort ? true: false);
    highlightConnection(connection);
    return connection;
}

//returns port open status and updates text fields
export function checkPortOpening(){
    const open = (curPort&&curPort.readable ? true: false);
    displayTextFields(open);
    return open;
}

export function initSerialSignals(){
    Serial.addEventListener("connect", (event) => {
    if (curPort && event.target === curPort) {
        checkPortUpdateUI();
    }
    });
    navigator.serial.addEventListener("disconnect", (event) => {
    if (curPort && event.target === curPort) {
        curPort = null; 
        checkPortUpdateUI();
    }
    });
}

//gets the SerialPort object. returns true if successful
async function selectPort(){
    try{
        curPort = await Serial.requestPort();
        return true;
    }
    catch(e){
        console.error("Port could not be selected",e);
        deselectPort();
        return false;
    }
}

//drops the SerialPort object
function deselectPort(){
    if(!curPort) return;
    curPort = null;
    checkPortUpdateUI();
}

//open the communication channel
async function openPort(baudRate = 9600) {
    if (!curPort) {
        console.error("No port selected");
        return;
    }
    
    try {
        await curPort.open({ baudRate });
    } catch(e) {
        console.error("Failed to open port", e);
        deselectPort();
    }
}

//selects the port and opens it
export async function connectToPort(baudRate = 9600){
    enableConnectionButtons(false);

    const successful = await selectPort();
    if(successful){
        await openPort(baudRate);
        checkPortUpdateUI();
        readFromPort(); //continues forever until port is closed
    }
    
    enableConnectionButtons(true);
}

//close the communication channel
async function closePort() {
    if (!curPort) {
        console.error("No port selected");
        return;
    }
    
    try {
        await curPort.close();
    } catch(e) {
        console.error("Failed to close port", e);
    }
}


export async function disconnectFromPort(){
    enableConnectionButtons(false);

    await closePort();
    deselectPort();

    enableConnectionButtons(true);
}

//takes the input, encodes it and sends it to port
export async function writeToPort(){
    if(!curPort || !curPort.writable){
        console.error("Not connected to any port");
        return;
    }

    const writeStream = curPort.writable;

    //take input from text field. Can be empty
    const inputBuff = getInputText();
    
    //encode the string to bytes
    const byteBuff = hexStringToByte(inputBuff);

    //write into the stream
    const writer = writeStream.getWriter();
    try{
        await writer.write(byteBuff);
    }
    catch(e){
        console.error("Could not send data to device", e);
    }
    finally{
        writer.releaseLock();
    }

}

//constantly reads and writes it to field
//currently writes byte by byte. Doesnt write everything all at once
async function readFromPort(){
    const readStream = curPort.readable;
    const reader = readStream.getReader();

    const chunks = [];
    let byteCount = 0;
    while(true){
        try{
            const {done, value} = await reader.read();

            if(done)
                break;

            let hexString = byteToHexString(value);
            hexString = hexString.toUpperCase();

            writeOutputText(hexString);
        }
        catch(e){
            console.error("data could not be received from port",e);
            break;
        }
        
    }
    reader.releaseLock();
}