import { disableCover, enableConnectionButtons, getBaudrate, getInputText, highlightConnection, setConnectionButtonAvailability, writeOutputText } from "../view/mainView.js";
import { byteToHexString, hexStringToByte } from "./encodingManager.js";

const Serial = navigator.serial;
let curReader = null;
let curWriter = null;
let curPort = null;

export function checkPortUpdateUI(){
    checkConnection();
    checkPortOpening();
}

//returns connection status and updates connection signifier
export function checkConnection(){
    const connection = (curPort ? true: false);
    highlightConnection(connection);
    setConnectionButtonAvailability(connection);
    return connection;
}

//returns port open status and updates cover on port
export function checkPortOpening(){
    const open = (curPort&&curPort.readable ? true: false);
    disableCover(open);
    return open;
}

//for handling connect and disconnect events
export function initSerialSignals(){
    Serial.addEventListener("connect", (event) => connectionEvent(event));
    navigator.serial.addEventListener("disconnect", (event) => disconnectEvent(event));
}

function connectionEvent(event){
    if (curPort && event.target === curPort) {
        checkPortUpdateUI();
    }
}
function disconnectEvent(event){
    if (curPort && event.target === curPort) {
        curPort = null; 
        checkPortUpdateUI();
    }
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

//drops the SerialPort object. Disconnect event manually called
function deselectPort(){
    if(!curPort) return;
    disconnectEvent({target: curPort});
}

//open the communication channel
async function openPort(bd) {
    if (!curPort) {
        console.error("No port selected");
        return;
    }
    try {
        await curPort.open({ baudRate: bd });
    } catch(e) {
        console.error("Failed to open port", e);
        deselectPort();
    }
}

//selects the port and opens it
export async function connectToPort(){
    enableConnectionButtons(false);

    const successful = await selectPort();
    if(successful){
        const baudrate = getBaudrate();
        await openPort(baudrate);
        checkPortUpdateUI();
        readFromPort(); //continues forever until port is closed
    }
}

//close the communication channel
async function closePort() {
    if (!curPort) {
        console.error("No port selected");
        return;
    }
    
    try {
        if(curReader)
            await curReader.cancel();
        await curPort.close();
    } catch(e) {
        console.error("Failed to close port", e);
    }
}

//buttons are enabled
export async function disconnectFromPort(){
    enableConnectionButtons(false);

    await closePort();
    deselectPort();
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
    curWriter = writeStream.getWriter();
    try{
        await curWriter.write(byteBuff);
    }
    catch(e){
        console.error("Could not send data to device", e);
    }
    finally{
        curWriter.releaseLock();
        curWriter = null;
    }
}

//constantly reads and writes it to field
//currently writes byte by byte. Doesnt write everything all at once
async function readFromPort(){
    const readStream = curPort.readable;
    curReader = readStream.getReader();

    const chunks = [];
    let byteCount = 0;
    while(true){
        try{
            const {done, value} = await curReader.read();

            if(done)
                break;

            let hexString = byteToHexString(value);
            hexString = hexString.toUpperCase();

            writeOutputText(hexString);
        }
        catch(e){
            //console.error("data could not be received from port",e);
            break;
        }
        
    }
    curReader.releaseLock();
    curReader = null;
}