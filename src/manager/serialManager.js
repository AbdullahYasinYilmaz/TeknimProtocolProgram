import { disableBaudrateInput, disableCover, enableConnectionButtons, enableManDataSendBtn, getBaudrate, getInputText, highlightConnection, setConnectionButtonAvailability, writeOutputText } from "../view/mainView.js";
import { byteToHexString, hexStringToByte } from "./encodingManager.js";

const Serial = navigator.serial;
let curReader = null;
let curWriter = null;
let curPort = null;

//selects the port, opens it and updates UI
export async function connectToPort(){
    enableConnectionButtons(false);

    try{
        const portSelected = await selectPort();
        if(portSelected){
            const baudrate = getBaudrate();
            await openPort(baudrate);
            startReading(); //continues forever until port is closed
            checkPortUpdateUI();
        }
        else{
            checkPortUpdateUI();
        }
    }
    catch(e){
        console.error("Could not connect to Port",e);
        await disconnectFromPort(); //what if it fails?
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
        return false;
    }
}

//open the communication channel
async function openPort(bd) {
    try {
        if(!curPort)
            throw new Error("No port selected");
        await curPort.open({ baudRate: bd });
        return true;
    } catch(e) {
        console.error("Failed to open port", e);
        return false;
    }
}

//closes the port, deselects it and updates UI
export async function disconnectFromPort(){
    enableConnectionButtons(false);

    await closePort();
    deselectPort();
    checkPortUpdateUI();
}

//drops the SerialPort object.
function deselectPort(){
    curPort = null;
}

//close the communication channel
let isClosing = false;
async function closePort() {
    if (!curPort || isClosing)
        return;

    isClosing = true;
    try {
        if(curReader){ //need reader to finish before we close the port
            await curReader.cancel();
            await readingPromise;
        }
        await curPort.close();
    } catch(e) {
        console.error("Failed to close port", e);
    }
    finally{
        isClosing = false;
    }
}

export function checkPortUpdateUI(){
    const portSelected = isPortSelected();
    const portOpen = isPortOpen();
    const isConnected = (portSelected && portOpen);
    highlightConnection(isConnected);
    setConnectionButtonAvailability(isConnected);
    disableCover(isConnected);
    disableBaudrateInput(isConnected);
}

//returns connection status and updates connection signifier
export function isPortSelected(){
    return (curPort ? true: false);
}

//returns port open status and updates cover on port
export function isPortOpen(){
    return !!(curPort?.readable); //double negation forces a boolean, ? return null if curPort is null
}

//for handling hardware connect and disconnect events
export function initHardwareSignals(){
    Serial.addEventListener("disconnect", (event) => {
        disconnectFromPort();
    });
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

//keep track of reading process
let readingPromise = null;
function startReading(){
    readingPromise = readFromPort();
}

//constantly reads and writes it to field
//collects all chunks into a buffer until timeout, then writes it
async function readFromPort(){
    const readStream = curPort.readable;
    curReader = readStream.getReader();

    //helpers for getting a complete package
    const IDLE_TIMEOUT_MS = 50;
    let timeoutID = null;
    let completePackage = new Uint8Array(0);
    function appendToPackage(buff1, buff2){
        const mergedBuff = new Uint8Array(buff1.length + buff2.length);
        mergedBuff.set(buff1,0);
        mergedBuff.set(buff2,buff1.length);
        return mergedBuff;
    }
    function sendCompletePackage(){
        if (completePackage.length === 0) return;
        const hexString = byteToHexString(completePackage).toUpperCase();
        writeOutputText(hexString);
        completePackage = new Uint8Array(0);
    }

    while(true){
        try{
            const {done, value} = await curReader.read();
            if(done)
                break;

            enableManDataSendBtn(false);
            if(timeoutID) clearTimeout(timeoutID);

            completePackage = appendToPackage(completePackage,value);
            timeoutID = setTimeout(()=>{
                sendCompletePackage();
                enableManDataSendBtn(true);
                timeoutID = null;
            },IDLE_TIMEOUT_MS);

        }
        catch(e){
            //console.error("data could not be received from port",e);
            break;
        }
    }
    // CLEANUP
    if (timeoutID) {
        clearTimeout(timeoutID);
    }
    if (completePackage.length > 0) {
        sendCompletePackage();
    }

    if (readStream.locked) {
        curReader.releaseLock();
    }
    curReader = null;
}